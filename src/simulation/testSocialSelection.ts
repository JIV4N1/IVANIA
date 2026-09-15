import assert from 'node:assert/strict';
import { Agent } from '../agents/Agent';
import { AgentEngine } from '../agents/AgentEngine';
import { World } from '../world/World';
import { Relationship } from '../relationships/Relationship';
import { WorldEvent } from '../events/WorldEvent';
import { captureKnownAgents, summarizeSocialInteractions } from './SocialMetrics';
import { runDaySimulation } from './runSimulation';

export function runSocialSelectionTests(): void {
  const make = (id: string) => new Agent(id, id,
    { extroversion: 50, curiosity: 90, kindness: 50, impulsivity: 50,
      sociability: 50, patience: 50, confidence: 50 },
    { energy: 80, hunger: 20, socialNeed: 90, mood: 50, isSleeping: false }, [], 'park');
  const a = make('Ana');
  const b = make('Carlos');
  const c = make('Diego');
  const world = new World('Social selection', [
    { id: 'park', name: 'Park', type: 'park', capabilities: ['SOCIALIZE'] },
    { id: 'other', name: 'Other', type: 'park', capabilities: ['SOCIALIZE'] },
  ], [a, b, c]);
  const engine = new AgentEngine(world);
  const relation = (id: string, value: number): Relationship => ({
    agentId: id, familiarity: value, trust: value, affinity: value, friendship: value,
  });
  const decide = () => {
    const before = JSON.stringify(world);
    const decision = engine.decide(a, 18);
    assert.equal(JSON.stringify(world), before, 'Selection must not mutate the world or relationships');
    return decision;
  };

  // A: stronger affinity wins even when the candidate appears later.
  a.relationships = [
    { agentId: b.id, familiarity: 10, trust: 20, affinity: 10, friendship: 30 },
    { agentId: c.id, familiarity: 10, trust: 20, affinity: 80, friendship: 30 },
  ];
  assert.equal(decide().targetAgentId, c.id);
  assert.match(decide().reason, /Diego.*score 40.5.*existing relationship/);
  world.agents = [a, c, b];
  assert.equal(decide().targetAgentId, c.id, 'Non-tied selection is independent of order');
  world.agents = [a, b, c];

  // B: high curiosity gives a stranger 27, above a weak relationship of 10.
  a.relationships = [relation(b.id, 10)];
  assert.equal(decide().targetAgentId, c.id);
  assert.match(decide().reason, /Diego.*score 27.*unknown/);

  // C: low curiosity gives a stranger 6, below that same relationship.
  a.personality.curiosity = 20;
  assert.equal(decide().targetAgentId, b.id);
  assert.match(decide().reason, /Carlos.*score 10.*known/);
  // An existing zero-valued relationship is known, not a stranger bonus.
  a.relationships = [relation(b.id, 0)];
  assert.equal(decide().targetAgentId, c.id);
  assert.match(decide().reason, /score 6.*unknown/);

  // D: exclude sleeping and remote candidates even when their scores are higher.
  a.relationships = [relation(b.id, 100), relation(c.id, 10)];
  b.state.isSleeping = true;
  assert.equal(decide().targetAgentId, c.id);
  b.state.isSleeping = false;
  b.locationId = 'other';
  assert.equal(decide().targetAgentId, c.id);
  b.locationId = 'park';

  // E: exact ties use existing order consistently, including unknown candidates.
  a.relationships = [relation(b.id, 10), relation(c.id, 10)];
  for (let i = 0; i < 5; i++) assert.equal(decide().targetAgentId, b.id);
  world.agents = [a, c, b];
  assert.equal(decide().targetAgentId, c.id);
  a.relationships = [];
  assert.equal(decide().targetAgentId, c.id);

  // F: self, sleeping and remote agents are not valid candidates.
  b.state.isSleeping = true;
  c.locationId = 'other';
  assert.equal(decide().intent, 'IDLE');
  assert.equal(decide().targetAgentId, undefined);
  world.agents = [a];
  assert.equal(decide().intent, 'IDLE');

  // Preserve extroversion thresholds and higher-priority biological needs.
  a.personality.extroversion = 90;
  assert.equal(engine.getSocialThreshold(a), 54);
  a.personality.extroversion = 20;
  assert.equal(engine.getSocialThreshold(a), 82);

  // Metrics use the relationship before the event, not the final relationship.
  a.relationships = [relation(b.id, 10)];
  b.relationships = [];
  const initial = captureKnownAgents([a, b]);
  const event = (id: string, agentIds: string[]): WorldEvent => ({
    id, agentIds, type: 'AGENTS_SOCIALIZED', description: '',
    locationId: 'park', day: 1, hour: 18, minute: 0, importance: 50,
  });
  const metrics = summarizeSocialInteractions([a, b], [event('1', [b.id, a.id]), event('2', [a.id, b.id])], initial);
  assert.equal(metrics.unknownInteractions, 1, 'First initiator has no previous relationship');
  assert.equal(metrics.knownInteractions, 1);
  assert.equal(metrics.pairs[0].count, 2, 'Pair totals combine both directions');
  assert.equal(metrics.agents[0].concentrationPercent, 100);
  assert.equal(initial.get(b.id)?.size, 0, 'Snapshot remains unchanged');
  assert.equal(summarizeSocialInteractions([a], [], captureKnownAgents([a])).agents[0].concentrationPercent, 0);

  const originalLog = console.log;
  let first: ReturnType<typeof runDaySimulation>;
  let second: ReturnType<typeof runDaySimulation>;
  try {
    console.log = () => {};
    first = runDaySimulation();
    second = runDaySimulation();
  } finally {
    console.log = originalLog;
  }
  assert.equal(first.totalTicks, 288);
  assert.equal(first.social.agents.length, 5);
  assert.equal(first.social.total, first.eventsByType.AGENTS_SOCIALIZED);
  assert.equal(first.social.knownInteractions + first.social.unknownInteractions, first.social.total);
  assert.equal(first.social.pairs.reduce((sum, pair) => sum + pair.count, 0), first.social.total);
  assert.equal(first.social.agents.reduce((sum, agent) => sum + agent.interactions, 0), first.social.total * 2);
  assert.deepEqual(first.social, second.social, '24h social results are deterministic');
  console.log('Social selection A-F and metrics tests passed.');
}
