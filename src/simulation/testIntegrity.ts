import assert from 'node:assert/strict';
import { Agent } from '../agents/Agent';
import { AgentDecision } from '../agents/AgentDecision';
import { World } from '../world/World';
import { Location } from '../world/Location';
import { SimulationClock } from './SimulationClock';
import { ActionExecutor } from './ActionExecutor';
import { EventManager } from '../events/EventManager';
import { RelationshipManager } from '../relationships/RelationshipManager';
import { MemoryManager } from '../memory/MemoryManager';

export function runIntegrityTests(): void {
  const locations: Location[] = [
    { id: 'park', name: 'Park', type: 'park', capabilities: ['SOCIALIZE'] },
    { id: 'home', name: 'Home', type: 'home', capabilities: ['REST'] },
    { id: 'cafe', name: 'Cafe', type: 'cafe', capabilities: ['EAT', 'SOCIALIZE'] },
    { id: 'work', name: 'Work', type: 'work', capabilities: ['WORK'] },
  ];
  const makeAgent = (id: string, locationId = 'park') => new Agent(id, id,
    { extroversion: 50, kindness: 50, curiosity: 50, impulsivity: 50,
      sociability: 50, patience: 50, confidence: 50 },
    { energy: 50, hunger: 85, socialNeed: 80, mood: 50, isSleeping: false },
    [], locationId);
  const agent = makeAgent('a');
  const target = makeAgent('b');
  const world = new World('Integrity', locations, [agent, target]);
  const clock = new SimulationClock();
  const events = new EventManager(world, clock);
  const executor = new ActionExecutor(world, new RelationshipManager(), new MemoryManager(), events, clock);

  const reject = (decision: AgentDecision) => {
    const before = JSON.stringify(world);
    const state = agent.state;
    const targetState = target.state;
    assert.equal(executor.execute(agent, decision).success, false, decision.intent + ' must fail');
    assert.equal(JSON.stringify(world), before, 'Rejected actions must have no side effects');
    assert.equal(agent.state, state);
    assert.equal(target.state, targetState);
  };
  for (const intent of ['EAT', 'REST', 'WORK'] as const) {
    reject({ intent, reason: 'Missing capability' });
    agent.locationId = 'missing';
    reject({ intent, reason: 'Missing location' });
    agent.locationId = 'park';
  }
  reject({ intent: 'SOCIALIZE', reason: 'Missing target' });
  reject({ intent: 'SOCIALIZE', targetAgentId: 'a', reason: 'Self target' });
  reject({ intent: 'SOCIALIZE', targetAgentId: 'missing', reason: 'Unknown target' });
  target.locationId = 'cafe';
  reject({ intent: 'SOCIALIZE', targetAgentId: 'b', reason: 'Different locations' });
  target.locationId = 'park';
  target.state.isSleeping = true;
  reject({ intent: 'SOCIALIZE', targetAgentId: 'b', reason: 'Sleeping target' });
  target.state.isSleeping = false;
  reject({ intent: 'MOVE', reason: 'Missing destination' });
  reject({ intent: 'MOVE', targetLocationId: 'missing', reason: 'Unknown destination' });
  reject({ intent: 'MOVE', targetLocationId: 'park', reason: 'Same destination' });

  // Successful actions still produce their existing effects.
  agent.locationId = 'cafe';
  assert(executor.execute(agent, { intent: 'EAT', reason: 'Allowed' }).success);
  assert.equal(agent.state.hunger, 30);
  agent.locationId = 'home';
  assert(executor.execute(agent, { intent: 'REST', reason: 'Allowed' }).success);
  assert.equal(agent.state.energy, 80);
  agent.locationId = 'work';
  assert(executor.execute(agent, { intent: 'WORK', reason: 'Allowed' }).success);
  assert.equal(agent.state.energy, 79);
  assert.equal(agent.state.hunger, 30.5);
  assert.deepEqual(world.events.map(event => event.type), ['AGENT_ATE', 'AGENT_RESTED', 'AGENT_WORKED']);
  executor.execute(agent, { intent: 'WORK', reason: 'Same hour' });
  assert.equal(world.events.filter(event => event.type === 'AGENT_WORKED').length, 1);
  for (let i = 0; i < 12; i++) clock.tick();
  executor.execute(agent, { intent: 'WORK', reason: 'Next hour' });
  assert.equal(world.events.filter(event => event.type === 'AGENT_WORKED').length, 2);
  assert(executor.execute(agent, { intent: 'MOVE', targetLocationId: 'park', reason: 'Allowed' }).success);
  assert(executor.execute(agent, { intent: 'SOCIALIZE', targetAgentId: 'b', reason: 'Awake target' }).success);
  assert.equal(agent.state.socialNeed, 50);
  assert.equal(target.state.socialNeed, 60);
  assert.equal(agent.memories.length, 1);
  assert.equal(target.memories.length, 1);
  assert.equal(agent.relationships.length, 1);
  assert.equal(target.relationships.length, 1);
  assert.equal(world.events.filter(event => event.type === 'AGENTS_SOCIALIZED').length, 1);

  const before = JSON.stringify(world);
  assert.throws(() => world.addAgent(makeAgent('a')), /Duplicate agent id/);
  assert.throws(() => world.addLocation({ ...locations[0] }), /Duplicate location id/);
  assert.throws(() => world.addAgent(makeAgent('unknown', 'missing')), /Unknown initial location/);
  assert.equal(JSON.stringify(world), before, 'Rejected additions leave the world unchanged');
  assert.throws(() => new World('Invalid', [locations[0], locations[0]]), /Duplicate location id/);
  assert.throws(() => new World('Invalid', locations, [makeAgent('a'), makeAgent('a')]), /Duplicate agent id/);
  assert.throws(() => new World('Invalid', locations, [makeAgent('a', 'missing')]), /Unknown initial location/);
  world.addLocation({ id: 'new', name: 'New', type: 'park', capabilities: [] });
  world.addAgent(makeAgent('new-agent', 'new'));
  assert.equal(world.getAgentById('new-agent')?.locationId, 'new');
  console.log('Integrity and action validation tests passed.');
}
