import assert from 'node:assert/strict';
import { Agent } from '../agents/Agent';
import { AgentEngine } from '../agents/AgentEngine';
import { World } from '../world/World';
import { SimulationClock } from './SimulationClock';
import { SimulationEngine } from './SimulationEngine';
import { ActionExecutor } from './ActionExecutor';
import { EventManager } from '../events/EventManager';
import { RelationshipManager } from '../relationships/RelationshipManager';
import { MemoryManager } from '../memory/MemoryManager';
import { ActivitySummaryFormatter } from '../activity/ActivitySummaryFormatter';
import { ActivitySummarySelector } from '../activity/ActivitySummarySelector';

export function runSocialEventCharacterizationTests(): void {
  const make = (id: string, need: number) => new Agent(id, id,
    { extroversion: 90, curiosity: 70, kindness: 50, impulsivity: 50,
      sociability: 50, patience: 50, confidence: 50 },
    { energy: 80, hunger: 20, socialNeed: need, mood: 50, isSleeping: false }, [], 'park');
  const setup = (needs: number[]) => {
    const agents = needs.map((need, i) => make(['Ana', 'Sofia', 'Tercero'][i], need));
    const world = new World('Social characterization', [
      { id: 'park', name: 'Park', type: 'park', capabilities: ['SOCIALIZE'] },
    ], agents);
    const clock = new SimulationClock(1, 18, 0);
    const events = new EventManager(world, clock);
    const engine = new SimulationEngine(world, clock, new AgentEngine(world),
      new ActionExecutor(world, new RelationshipManager(), new MemoryManager(), events, clock), events);
    return { agents, world, engine };
  };
  const social = (world: World) => world.events.filter(e => e.type === 'AGENTS_SOCIALIZED');

  const one = setup([90, 10]);
  const oneResult = one.engine.tick();
  assert.equal(oneResult.get('Ana')?.decision.targetAgentId, 'Sofia');
  assert.equal(oneResult.get('Sofia')?.decision.intent, 'IDLE');
  assert.deepEqual(social(one.world).map(e => e.agentIds), [['Ana', 'Sofia']]);
  assert.deepEqual(one.agents.map(a => a.state.socialNeed), [61, 0]);
  assert.deepEqual(one.agents.map(a => a.memories.length), [1, 1]);
  assert.deepEqual(one.agents.map(a => a.relationships[0]?.familiarity), [10, 10]);

  const reciprocal = setup([90, 90]);
  const reciprocalResult = reciprocal.engine.tick();
  assert.equal(reciprocalResult.get('Ana')?.action.success, true);
  assert.equal(reciprocalResult.get('Sofia')?.action.success, true);
  assert.deepEqual(social(reciprocal.world).map(e => e.agentIds),
    [['Ana', 'Sofia'], ['Sofia', 'Ana']]);
  assert.equal(new Set(social(reciprocal.world).map(e => e.id)).size, 2);
  assert.deepEqual(reciprocal.agents.map(a => a.state.socialNeed), [41, 41]);
  assert.deepEqual(reciprocal.agents.map(a => a.memories.length), [2, 2]);
  assert.deepEqual(reciprocal.agents.map(a => a.relationships[0]?.familiarity), [20, 20]);

  const third = setup([90, 90, 10]);
  for (const agent of third.agents.slice(0, 2)) {
    agent.relationships = [{ agentId: 'Tercero', familiarity: 80, trust: 80,
      affinity: 80, friendship: 80 }];
  }
  const thirdResult = third.engine.tick();
  assert.equal(thirdResult.get('Ana')?.decision.targetAgentId, 'Tercero');
  assert.equal(thirdResult.get('Sofia')?.decision.targetAgentId, 'Tercero');
  assert.deepEqual(social(third.world).map(e => e.agentIds),
    [['Ana', 'Tercero'], ['Sofia', 'Tercero']]);
  assert.deepEqual(third.agents.map(a => a.memories.length), [1, 1, 2]);
  assert.equal(third.agents[2].state.socialNeed, 0);

  const repeated = setup([100, 10]);
  repeated.engine.tick();
  repeated.engine.tick();
  assert.equal(social(repeated.world).length, 2);
  assert.deepEqual(social(repeated.world).map(e => e.minute), [5, 10]);
  assert.deepEqual(repeated.agents.map(a => a.memories.length), [2, 2]);
  assert.equal(repeated.agents[0].relationships[0].familiarity, 20);

  const source = social(reciprocal.world);
  const items = new ActivitySummaryFormatter().format(source, 'Ana');
  const selected = new ActivitySummarySelector().select(items, 8);
  assert.equal(items.length, source.length);
  assert.equal(selected.length, source.length);
  assert.deepEqual(items.map(i => i.eventIds), source.map(e => [e.id]));
  assert.deepEqual(selected.map(i => i.eventIds), source.map(e => [e.id]));
  assert.deepEqual(source.map(e => e.agentIds), [['Ana', 'Sofia'], ['Sofia', 'Ana']]);
  console.log('Social event characterization: solo, reciprocal, shared target, repeated ticks and summary passed.');
}
