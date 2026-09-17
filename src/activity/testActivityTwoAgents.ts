import assert from 'node:assert/strict';
import { SimulationClock } from '../simulation/SimulationClock';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { World } from '../world/World';
import { ActivitySummaryFromConnectionService } from './ActivitySummaryFromConnectionService';
import { ActivitySummaryMoment, ActivitySummaryPresenter } from './ActivitySummaryPresenter';
import { ActivitySummaryQueryResult } from './ActivitySummaryQueryResult';
import { ActivitySummaryService } from './ActivitySummaryService';
import { LastConnectionRegistry } from './LastConnectionRegistry';
import { createActivityDemoSimulation } from './createActivityDemoSimulation';
import { runActivityTwoAgentsDemo } from './demoActivityTwoAgents';

export function runActivityTwoAgentsTests(): void {
  const { world, clock, events, engine } = createActivityDemoSimulation();
  const registry = new LastConnectionRegistry();
  const service = new ActivitySummaryFromConnectionService(registry, new ActivitySummaryService(events));
  const presenter = new ActivitySummaryPresenter();
  const now = () => ({ day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() });
  const minutes = (m: ActivitySummaryMoment) => m.day * 1440 + m.hour * 60 + m.minute;
  const advance = (ticks: number) => { for (let i = 0; i < ticks; i++) engine.tick(); };
  const connections = () => [registry.get('agent-ana'), registry.get('agent-sofia')];
  const state = () => JSON.stringify({ world, time: now(), connections: connections() });
  const saved: { result: ActivitySummaryQueryResult; snapshot: string }[] = [];
  const checkSaved = () => {
    for (const { result, snapshot } of saved) assert.equal(JSON.stringify(result), snapshot);
  };
  const query = (agentId: string, cutoff: ActivitySummaryMoment) => {
    // Snapshot immediately around each query: ticks are never inside this assertion window.
    const before = state();
    const result = service.getSummaryAt(agentId, cutoff, 8, 'balanced')!;
    assert.equal(state(), before, 'Query leaves world, agents, clock, history and both registrations unchanged');
    const expectedEvents = world.events.filter(event => event.agentIds.includes(agentId) &&
      minutes(event) > minutes(result.from) && minutes(event) <= minutes(cutoff));
    assert.equal(result.totalEvents, expectedEvents.length);
    const allowed = new Set(expectedEvents.map(event => event.id));
    for (const id of result.completeItems.flatMap(item => item.eventIds)) assert(allowed.has(id));
    assert.equal(result.totalItems, result.completeItems.length);
    assert.equal(result.selectedCount, result.selectedItems.length);
    assert.equal(result.omittedCount, result.totalItems - result.selectedCount);
    const snapshot = JSON.stringify(result);
    const beforePresentation = state();
    presenter.present(result.selectedItems, result.totalItems, result.from, result.to);
    assert.equal(state(), beforePresentation, 'Presentation does not change simulation or registrations');
    assert.equal(JSON.stringify(result), snapshot);
    saved.push({ result, snapshot });
    return result;
  };
  const confirm = (agentId: string, cutoff: ActivitySummaryMoment) => {
    const before = JSON.stringify(world);
    const beforeTime = now();
    registry.register(agentId, cutoff);
    assert.equal(JSON.stringify(world), before);
    assert.deepEqual(now(), beforeTime);
    checkSaved();
  };

  advance(24);
  const anaDeparture = now();
  confirm('agent-ana', anaDeparture);
  advance(24);
  const sofiaDeparture = now();
  confirm('agent-sofia', sofiaDeparture);
  assert.deepEqual(connections(), [{ day: 1, hour: 10, minute: 0 }, { day: 1, hour: 12, minute: 0 }]);
  advance(72);
  const anaCutoff = now();
  assert.deepEqual(anaCutoff, { day: 1, hour: 18, minute: 0 });
  const ana = query('agent-ana', anaCutoff);
  assert.deepEqual(query('agent-ana', anaCutoff), ana);
  const beforeTicks = JSON.stringify(world);
  advance(24);
  assert.notEqual(JSON.stringify(world), beforeTicks, 'Normal ticks change the simulation');
  checkSaved();
  const sofiaCutoff = now();
  assert.deepEqual(sofiaCutoff, { day: 1, hour: 20, minute: 0 });
  assert.deepEqual(query('agent-ana', anaCutoff), ana, 'Captured cutoff remains 18:00 at clock 20:00');
  const sofia = query('agent-sofia', sofiaCutoff);
  assert.deepEqual(ana.from, anaDeparture);
  assert.deepEqual(sofia.from, sofiaDeparture);
  assert.deepEqual(ana.to, anaCutoff);
  assert.deepEqual(sofia.to, sofiaCutoff);
  assert.equal(ana.totalEvents, 26);
  assert.equal(ana.totalItems, 22);

  const shared = world.events.find(event => event.type === 'AGENTS_SOCIALIZED' &&
    event.agentIds.includes('agent-ana') && event.agentIds.includes('agent-sofia') &&
    minutes(event) > minutes(sofiaDeparture) && minutes(event) <= minutes(anaCutoff));
  assert(shared, 'Real simulation must provide a social interaction in both initial intervals');
  const names: Record<string, string> = { 'agent-ana': 'Ana', 'agent-sofia': 'Sofía' };
  const checkPerspectives = (id: string, initiator: string, recipient: string) => {
    for (const result of [ana, sofia]) {
      const items = result.completeItems.filter(item => item.eventIds.includes(id));
      assert.equal(items.length, 1);
      assert.deepEqual(items[0].eventIds, [id], 'Social event retains its original ID as an individual item');
      assert.equal(items[0].description, result.agentId === initiator
        ? `Iniciaste una conversación con ${names[recipient]} en Cafetería.`
        : `${names[initiator]} inició una conversación contigo en Cafetería.`);
    }
  };
  checkPerspectives(shared.id, shared.agentIds[0], shared.agentIds[1]);
  const reciprocal = world.events.find(event => event.type === 'AGENTS_SOCIALIZED' &&
    minutes(event) === minutes(shared) && event.locationId === shared.locationId &&
    event.agentIds[0] === shared.agentIds[1] && event.agentIds[1] === shared.agentIds[0]);
  assert(reciprocal);
  assert.notEqual(reciprocal, shared);
  assert.notEqual(reciprocal.id, shared.id);
  checkPerspectives(reciprocal.id, reciprocal.agentIds[0], reciprocal.agentIds[1]);
  for (const result of [ana, sofia]) {
    assert.notEqual(result.completeItems.find(item => item.eventIds.includes(shared.id)),
      result.completeItems.find(item => item.eventIds.includes(reciprocal.id)));
  }

  confirm('agent-ana', ana.to);
  assert.deepEqual(registry.get('agent-ana'), anaCutoff);
  assert.deepEqual(registry.get('agent-sofia'), sofiaDeparture);
  assert.deepEqual(query('agent-sofia', sofiaCutoff), sofia);
  const anaAfter = query('agent-ana', sofiaCutoff);
  assert.deepEqual(anaAfter.from, anaCutoff);
  const later = world.events.filter(event => event.agentIds.includes('agent-ana') &&
    minutes(event) > minutes(anaCutoff) && minutes(event) <= minutes(sofiaCutoff));
  assert.equal(later.length, 2);
  assert.deepEqual(anaAfter.completeItems.flatMap(item => item.eventIds), later.map(event => event.id));
  assert(later.every(event => !ana.completeItems.some(item => item.eventIds.includes(event.id))));
  confirm('agent-sofia', sofia.to);
  assert.deepEqual(connections(), [anaCutoff, sofiaCutoff]);
  assert.deepEqual(query('agent-ana', sofiaCutoff), anaAfter);
  checkSaved();
  console.log(`Two-agent integration A-L passed: one shared world, Ana ${ana.totalEvents}/${ana.totalItems}, Sofia ${sofia.totalEvents}/${sofia.totalItems}, Ana after confirmation ${anaAfter.totalEvents}/${anaAfter.totalItems}.`);

  // Verify the demo also uses exactly one world, clock and engine for both agents.
  const originalTick = SimulationEngine.prototype.tick;
  const originalClockTick = SimulationClock.prototype.tick;
  const originalGetAgent = World.prototype.getAgentById;
  const originalLog = console.log;
  const engines = new Set<SimulationEngine>();
  const clocks = new Set<SimulationClock>();
  const worlds = new Set<World>();
  const output: string[] = [];
  let ticks = 0;
  try {
    SimulationEngine.prototype.tick = function () { engines.add(this); ticks++; return originalTick.call(this); };
    SimulationClock.prototype.tick = function () { clocks.add(this); return originalClockTick.call(this); };
    World.prototype.getAgentById = function (id) { worlds.add(this); return originalGetAgent.call(this, id); };
    console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
    runActivityTwoAgentsDemo();
  } finally {
    SimulationEngine.prototype.tick = originalTick;
    SimulationClock.prototype.tick = originalClockTick;
    World.prototype.getAgentById = originalGetAgent;
    console.log = originalLog;
  }
  assert.deepEqual([engines.size, clocks.size, worlds.size, ticks], [1, 1, 1, 144]);
  assert(output.some(line => line.includes('Sofía conserva su registro de las 12:00 y el mismo resultado')));
  assert(output.some(line => line.includes('Ana conserva su registro de las 18:00 y el mismo resultado')));
  assert(output.some(line => line.startsWith('Interacción compartida:')));
  assert(output.some(line => line.startsWith('Acción recíproca separada:')));
  assert.equal(output.filter(line => line.startsWith('Mientras estabas fuera...')).length, 3);
  console.log('Two-agent demo: one world, clock and engine; 144 normal ticks; both independent confirmations passed.');
}

if (require.main === module) runActivityTwoAgentsTests();
