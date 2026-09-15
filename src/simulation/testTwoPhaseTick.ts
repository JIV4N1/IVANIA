import assert from 'node:assert/strict';
import { Agent } from '../agents/Agent';
import { World } from '../world/World';
import { AgentEngine } from '../agents/AgentEngine';
import { SimulationClock } from './SimulationClock';
import { SimulationEngine } from './SimulationEngine';
import { ActionExecutor } from './ActionExecutor';
import { EventManager } from '../events/EventManager';
import { MemoryManager } from '../memory/MemoryManager';
import { RelationshipManager } from '../relationships/RelationshipManager';
import { runDaySimulation } from './runSimulation';

export function runTwoPhaseTickTests(): void {
  const setup = (hour = 18, minute = 0) => {
    const make = (id: string) => new Agent(id, id,
      { extroversion: 50, curiosity: 50, kindness: 50, impulsivity: 50,
        sociability: 50, patience: 50, confidence: 50 },
      { energy: 80, hunger: 20, socialNeed: 70, mood: 50, isSleeping: false }, [], 'park');
    const ana = make('Ana');
    const carlos = make('Carlos');
    const world = new World('Two phases', [
      { id: 'park', name: 'Park', type: 'park', capabilities: ['SOCIALIZE'] },
      { id: 'home', name: 'Home', type: 'home', capabilities: ['REST'] },
      { id: 'cafe', name: 'Cafe', type: 'cafe', capabilities: ['EAT'] },
      { id: 'work', name: 'Work', type: 'work', capabilities: ['WORK'] },
    ], [ana, carlos]);
    const clock = new SimulationClock(1, hour, minute);
    const decisions = new AgentEngine(world);
    const events = new EventManager(world, clock);
    const executor = new ActionExecutor(world, new RelationshipManager(), new MemoryManager(), events, clock);
    const engine = new SimulationEngine(world, clock, decisions, executor, events);
    return { make, ana, carlos, world, clock, decisions, executor, engine };
  };

  // A/B: both see every biological update, but no actions or social side effects.
  const social = setup();
  const trace: string[] = [];
  let snapshot: string | undefined;
  const decide = social.decisions.decide.bind(social.decisions);
  social.decisions.decide = (agent, hour) => {
    trace.push('decide:' + agent.id);
    for (const other of social.world.agents) {
      assert.equal(other.state.socialNeed, 71);
      assert.equal(other.state.hunger, 20.75);
      assert.equal(other.state.energy, 79.5);
    }
    const before = JSON.stringify(social.world);
    snapshot ??= before;
    assert.equal(before, snapshot, 'Every decision sees the same prepared world');
    assert.equal(social.world.events.length, 0);
    const result = decide(agent, hour);
    assert.equal(JSON.stringify(social.world), before, 'decide remains pure');
    return result;
  };
  const execute = social.executor.execute.bind(social.executor);
  social.executor.execute = (agent, decision) => {
    assert.deepEqual(trace.slice(0, 2), ['decide:Ana', 'decide:Carlos']);
    trace.push('execute:' + agent.id);
    assert(Object.isFrozen(decision));
    if (agent.id === 'Carlos') assert.equal(agent.state.socialNeed, 51);
    return execute(agent, decision);
  };
  const results = social.engine.tick();
  assert.deepEqual(trace, ['decide:Ana', 'decide:Carlos', 'execute:Ana', 'execute:Carlos']);
  assert.equal(social.clock.getMinute(), 5, 'Advance exactly once');
  assert.equal(results.get('Ana')?.decision.targetAgentId, 'Carlos');
  assert.equal(results.get('Carlos')?.decision.targetAgentId, 'Ana');
  assert.match(results.get('Carlos')!.decision.reason, /unknown/, 'Reason reflects pre-action relationship');
  assert.equal(results.get('Carlos')?.action.success, true, 'Do not cancel still-valid reciprocal actions');
  assert.equal(social.world.events.length, 2);
  assert.equal(social.ana.state.socialNeed, 21);
  assert.equal(social.carlos.state.socialNeed, 21);
  const reversed = setup();
  reversed.world.agents.reverse();
  const reversedResults = reversed.engine.tick();
  for (const id of ['Ana', 'Carlos']) {
    assert.deepEqual(reversedResults.get(id)?.decision, results.get(id)?.decision);
  }

  // C: Ana leaves before Carlos executes a previously valid social decision.
  const conflict = setup();
  conflict.ana.state.hunger = 85;
  let calls = 0;
  const conflictDecide = conflict.decisions.decide.bind(conflict.decisions);
  conflict.decisions.decide = (agent, hour) => { calls++; return conflictDecide(agent, hour); };
  const conflictExecute = conflict.executor.execute.bind(conflict.executor);
  conflict.executor.execute = (agent, decision) => {
    const before = JSON.stringify(conflict.world);
    const result = conflictExecute(agent, decision);
    if (agent.id === 'Carlos') {
      assert.equal(decision.intent, 'SOCIALIZE');
      assert.equal(result.success, false);
      assert.equal(JSON.stringify(conflict.world), before, 'Conflict produces no side effects');
    }
    return result;
  };
  const conflictResults = conflict.engine.tick();
  assert.equal(calls, 2, 'No automatic replanning');
  assert.equal(conflictResults.get('Ana')?.decision.intent, 'MOVE');
  assert.equal(conflict.ana.locationId, 'cafe');
  assert.equal(conflictResults.get('Carlos')?.decision.targetAgentId, 'Ana');
  assert.equal(conflict.world.events.length, 1, 'Only the successful move creates an event');
  assert.equal(conflict.carlos.memories.length, 0);
  assert.equal(conflict.carlos.relationships.length, 0);

  // D: different action types still execute once after collection.
  const actions = setup(10);
  actions.ana.locationId = 'cafe';
  actions.ana.state.hunger = 85;
  actions.carlos.locationId = 'home';
  actions.carlos.state.energy = 15;
  const worker = actions.make('Worker'); worker.locationId = 'work';
  const mover = actions.make('Mover');
  actions.world.addAgent(worker); actions.world.addAgent(mover);
  const actionResults = actions.engine.tick();
  assert.deepEqual([...actionResults.values()].map(result => result.decision.intent), ['EAT', 'REST', 'WORK', 'MOVE']);
  assert([...actionResults.values()].every(result => result.action.success));
  assert.equal(actions.ana.state.hunger, 30.75);
  assert.equal(actions.carlos.state.energy, 44.5);
  assert.equal(worker.state.energy, 78.5);
  assert.equal(mover.locationId, 'work');

  // E: night moves and sleep bypass normal decisions; all wake before perception.
  const night = setup(22, 55);
  night.ana.locationId = 'home';
  night.decisions.decide = () => { throw new Error('Sleeping/night-move agents must not decide normally'); };
  const nightResults = night.engine.tick();
  assert.equal(nightResults.get('Ana')?.decision.intent, 'IDLE');
  assert.equal(nightResults.get('Carlos')?.decision.intent, 'MOVE');
  assert(night.ana.state.isSleeping);
  assert.equal(night.carlos.state.isSleeping, false);
  night.engine.tick();
  assert(night.carlos.state.isSleeping);
  assert.equal(night.world.events.filter(event => event.type === 'AGENT_WENT_TO_SLEEP').length, 2);
  const wake = setup(6, 55);
  for (const agent of wake.world.agents) { agent.locationId = 'home'; agent.state.isSleeping = true; }
  const wakeDecide = wake.decisions.decide.bind(wake.decisions);
  wake.decisions.decide = (agent, hour) => {
    assert(wake.world.agents.every(other => !other.state.isSleeping));
    assert.equal(wake.world.events.length, 0, 'Transition events are deferred until execution');
    return wakeDecide(agent, hour);
  };
  wake.engine.tick();
  assert.equal(wake.world.events.filter(event => event.type === 'AGENT_WOKE_UP').length, 2);

  // F: repeat the unchanged 24h fixture and check biological/work regressions.
  const log = console.log;
  let first: ReturnType<typeof runDaySimulation>;
  let second: ReturnType<typeof runDaySimulation>;
  try {
    console.log = () => {};
    first = runDaySimulation(); second = runDaySimulation();
  } finally { console.log = log; }
  assert.deepEqual(first, second, 'All summary metrics remain deterministic');
  assert.equal(first.totalTicks, 288);
  assert.equal(first.eventsByType.AGENT_ATE, 16);
  assert.equal(first.eventsByType.AGENT_RESTED, 20);
  assert.equal(first.eventsByType.AGENT_WORKED, 40);
  assert.equal(first.eventsByType.AGENT_WENT_TO_SLEEP, 10);
  assert.equal(first.eventsByType.AGENT_WOKE_UP, 5);
  assert.equal(first.work.outsideHoursEvents, 0);
  assert.equal(first.work.outsideHoursActions, 0);
  assert.equal(first.nightSocializationsCount, 0);
  assert(first.agentSummaries.every(agent => agent.energyAtWakeup === 99.5));
  console.log('Two-phase tick A-F, conflict and regression tests passed.');
}
