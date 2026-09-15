import assert from 'node:assert/strict';
import { Agent } from '../agents/Agent';
import { AgentEngine } from '../agents/AgentEngine';
import { World } from '../world/World';
import { Location } from '../world/Location';
import { SimulationClock } from './SimulationClock';
import { SimulationEngine } from './SimulationEngine';
import { ActionExecutor } from './ActionExecutor';
import { EventManager } from '../events/EventManager';
import { RelationshipManager } from '../relationships/RelationshipManager';
import { MemoryManager } from '../memory/MemoryManager';
import { runDaySimulation } from './runSimulation';

export function runWorkScheduleTests(): void {
  const setup = (hour: number, minute = 0, at = 'home', withWork = true) => {
    const locations: Location[] = [
      { id: 'home', name: 'Home', type: 'home', capabilities: ['REST'] },
      { id: 'cafe', name: 'Cafe', type: 'cafe', capabilities: ['EAT', 'SOCIALIZE'] },
    ];
    if (withWork) locations.push(
      { id: 'work', name: 'Work', type: 'work', capabilities: ['WORK'] },
      { id: 'work2', name: 'Work 2', type: 'work', capabilities: ['WORK'] });
    const agent = new Agent('a', 'A', {
      extroversion: 50, kindness: 50, curiosity: 50, impulsivity: 50,
      sociability: 50, patience: 50, confidence: 50,
    }, { energy: 80, hunger: 20, socialNeed: 90, mood: 50, isSleeping: false }, [], at);
    const world = new World('Work test', locations, [agent]);
    const clock = new SimulationClock(1, hour, minute);
    const decisions = new AgentEngine(world);
    const events = new EventManager(world, clock);
    const executor = new ActionExecutor(world, new RelationshipManager(), new MemoryManager(), events, clock);
    const engine = new SimulationEngine(world, clock, decisions, executor, events);
    const tickIntent = () => engine.tick().get(agent.id)!.decision.intent;
    return { agent, world, clock, decisions, tickIntent };
  };

  // A: exact opening boundary, including agents already at work.
  const arrival = setup(8, 55);
  assert.notEqual(arrival.decisions.decide(arrival.agent, 8).intent, 'WORK');
  assert.equal(arrival.tickIntent(), 'MOVE');
  assert.equal(arrival.agent.locationId, 'work', 'Select first compatible location');
  assert.equal(arrival.tickIntent(), 'WORK');
  assert.equal(setup(8, 55, 'work').tickIntent(), 'WORK');

  // B: work outranks a high social need.
  const working = setup(10, 0, 'work');
  assert.equal(working.decisions.decide(working.agent, 10).intent, 'WORK');
  assert.equal(working.tickIntent(), 'WORK');

  // C/D: critical needs outrank work; return automatically after satisfying them.
  const hungry = setup(10, 55, 'work');
  hungry.agent.state.hunger = 85;
  assert.equal(hungry.tickIntent(), 'MOVE');
  assert.equal(hungry.agent.locationId, 'cafe');
  assert.equal(hungry.tickIntent(), 'EAT');
  assert.equal(hungry.tickIntent(), 'MOVE');
  assert.equal(hungry.agent.locationId, 'work');
  assert.equal(hungry.tickIntent(), 'WORK');
  const eating = setup(11, 0, 'cafe');
  eating.agent.state.hunger = 80;
  eating.agent.state.energy = 15;
  assert.equal(eating.decisions.decide(eating.agent, 11).intent, 'EAT');
  const tired = setup(13, 55, 'work');
  tired.agent.state.energy = 15;
  assert.equal(tired.tickIntent(), 'MOVE');
  assert.equal(tired.agent.locationId, 'home');
  assert.equal(tired.tickIntent(), 'REST');
  assert.equal(tired.tickIntent(), 'MOVE');
  assert.equal(tired.agent.locationId, 'work');
  assert.equal(tired.tickIntent(), 'WORK');
  const resting = setup(14, 0, 'home');
  resting.agent.state.energy = 20;
  assert.equal(resting.decisions.decide(resting.agent, 14).intent, 'REST');

  // E: closing boundary and all hours outside the workday.
  const closing = setup(16, 55, 'work');
  assert.equal(closing.decisions.decide(closing.agent, 16).intent, 'WORK');
  assert.notEqual(closing.tickIntent(), 'WORK');
  for (const hour of [0, 7, 8, 17, 18, 23]) {
    assert.notEqual(closing.decisions.decide(closing.agent, hour).intent, 'WORK');
  }

  // F: missing work location falls back to the existing social/idle rules.
  const noWork = setup(10, 0, 'cafe', false);
  noWork.agent.state.socialNeed = 0;
  assert.equal(noWork.decisions.decide(noWork.agent, 10).intent, 'IDLE');
  const companion = new Agent('b', 'B', { ...noWork.agent.personality },
    { ...noWork.agent.state }, [], 'cafe');
  noWork.world.addAgent(companion);
  noWork.agent.state.socialNeed = 90;
  assert.equal(noWork.decisions.decide(noWork.agent, 10).intent, 'SOCIALIZE');

  // G: a sleeping agent never chooses WORK, even in working hours.
  working.agent.state.isSleeping = true;
  for (const hour of [0, 9, 10, 16, 17, 23]) {
    assert.notEqual(working.decisions.decide(working.agent, hour).intent, 'WORK');
  }

  // End-to-end invariants for the unchanged five-agent, 288-tick scenario.
  const originalLog = console.log;
  let summary: ReturnType<typeof runDaySimulation>;
  try {
    console.log = () => {};
    summary = runDaySimulation();
  } finally {
    console.log = originalLog;
  }
  assert.equal(summary.totalTicks, 288);
  assert.equal(summary.work.scheduledTicks, 96);
  assert.equal(summary.work.agents.length, 5);
  assert(summary.work.events > 0);
  assert.equal(summary.work.outsideHoursEvents, 0);
  assert.equal(summary.work.outsideHoursActions, 0);
  assert.equal(summary.work.socializationsDuringWork, 0);
  for (const agent of summary.work.agents) {
    assert(agent.firstArrival && agent.lastWork);
    assert(agent.workTicks > 0 && agent.workTicks <= agent.ticksAtWork);
    assert(agent.workdayPresencePercent > 0 && agent.workdayPresencePercent <= 100);
    assert(agent.eatInterruptions > 0 && agent.restInterruptions > 0);
  }
  console.log('WORK schedule A-G, return-to-work and 24h tests passed.');
}
