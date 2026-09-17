import assert from 'node:assert/strict';
import { World } from '../world/World';
import { EventManager } from '../events/EventManager';
import { WorldEvent } from '../events/WorldEvent';
import { SimulationClock } from '../simulation/SimulationClock';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { ActivitySummaryFromConnectionService } from './ActivitySummaryFromConnectionService';
import { ActivitySummaryMoment } from './ActivitySummaryPresenter';
import { ActivitySummaryService } from './ActivitySummaryService';
import { LastConnectionRegistry } from './LastConnectionRegistry';
import { createActivityDemoSimulation } from './createActivityDemoSimulation';
import { runActivitySessionDemo } from './demoActivitySession';

export function runActivitySessionTests(): void {
  const registry = new LastConnectionRegistry();
  const departure = { day: 1, hour: 23, minute: 55 };
  const midnight = { day: 2, hour: 0, minute: 0 };
  assert.equal(registry.get('ana'), undefined);
  const mutable = { ...departure };
  registry.register('ana', mutable);
  mutable.day = 99;
  assert.deepEqual(registry.get('ana'), departure);
  registry.get('ana')!.hour = 0;
  assert.deepEqual(registry.get('ana'), departure);
  registry.register('sofia', midnight);
  registry.register('ana', departure);
  assert.deepEqual(registry.get('ana'), departure);
  for (const earlier of [{ day: 1, hour: 23, minute: 50 }, { day: 1, hour: 22, minute: 55 }]) {
    assert.throws(() => registry.register('ana', earlier), RangeError);
    assert.deepEqual(registry.get('ana'), departure);
  }
  registry.register('ana', midnight);
  assert.throws(() => registry.register('ana', departure), RangeError);
  assert.deepEqual(registry.get('sofia'), midnight);
  assert.equal(new LastConnectionRegistry().get('ana'), undefined);
  for (const [field, values] of [
    ['day', [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]],
    ['hour', [-1, 24, 1.5, NaN, Infinity]],
    ['minute', [-1, 60, 1, 2.5, 59, NaN, Infinity]],
  ] as const) {
    for (const value of values) {
      const invalid = { ...midnight, [field]: value };
      assert.throws(() => registry.register('ana', invalid), RangeError);
      assert.throws(() => registry.register('unknown', invalid), RangeError);
      assert.deepEqual(registry.get('ana'), midnight);
      assert.equal(registry.get('unknown'), undefined);
    }
  }
  console.log('Connection registry A-F: missing, independent, defensive, idempotent, monotonic and valid moments passed.');

  const event = (id: string, moment: ActivitySummaryMoment, type: WorldEvent['type'] = 'AGENTS_SOCIALIZED'): WorldEvent => ({
    id, ...moment, type, agentIds: ['ana', 'sofia'], importance: type === 'AGENTS_SOCIALIZED' ? 50 : 20,
    description: 'Same description', locationId: 'cafe',
  });
  const history = [event('before', { day: 1, hour: 23, minute: 50 }),
    event('cutoff-a', departure), event('cutoff-b', departure),
    event('midnight-a', midnight), event('midnight-b', midnight),
    event('after-a', { day: 2, hour: 0, minute: 5 }),
    event('after-b', { day: 2, hour: 0, minute: 5 }),
    event('work', { day: 2, hour: 0, minute: 10 }, 'AGENT_WORKED')];
  const world = new World('Connection fixtures', [], [], history);
  const explicit = new ActivitySummaryService(new EventManager(world, new SimulationClock(2, 0, 10)));
  const checkpoints = new LastConnectionRegistry();
  const summaries = new ActivitySummaryFromConnectionService(checkpoints, explicit);
  assert.equal(summaries.getFormattedSummaryForAgent('ana'), undefined);
  assert.equal(summaries.getBriefSummaryForAgent('ana'), undefined);
  assert.equal(checkpoints.get('ana'), undefined);
  checkpoints.register('ana', departure);
  checkpoints.register('sofia', departure);
  const beforeQueries = JSON.stringify(world);
  history.forEach(item => { Object.freeze(item.agentIds); Object.freeze(item); });
  Object.freeze(history);
  Object.freeze(world);
  const full = summaries.getFormattedSummaryForAgent('ana')!;
  assert.deepEqual(full.flatMap(item => item.eventIds), ['midnight-a', 'midnight-b', 'after-a', 'after-b', 'work']);
  const fullSnapshot = JSON.stringify(full);
  full.forEach(item => { Object.freeze(item.eventIds); Object.freeze(item); });
  Object.freeze(full);
  assert.deepEqual(summaries.getFormattedSummaryForAgent('ana'), full);
  for (const policy of ['important', 'balanced'] as const) {
    for (const limit of [0, 1, 2, 8]) {
      assert.deepEqual(summaries.getBriefSummaryForAgent('ana', limit, policy),
        explicit.getBriefSummaryForAgent('ana', departure.day, departure.hour, departure.minute, limit, policy));
    }
    for (const invalid of [-1, 1.5, NaN, Infinity]) {
      assert.throws(() => summaries.getBriefSummaryForAgent('ana', invalid, policy), RangeError);
    }
  }
  assert.deepEqual(summaries.getBriefSummaryForAgent('ana'), explicit.getBriefSummaryForAgent('ana', 1, 23, 55));
  assert.deepEqual(summaries.getBriefSummaryForAgent('ana', 2)!.map(item => item.type),
    ['AGENTS_SOCIALIZED', 'AGENTS_SOCIALIZED']);
  assert.deepEqual(summaries.getBriefSummaryForAgent('ana', 2, 'balanced')!.map(item => item.type),
    ['AGENTS_SOCIALIZED', 'AGENT_WORKED']);
  const editable = summaries.getFormattedSummaryForAgent('ana')!;
  editable[0].eventIds.push('external-change');
  editable[0].importance = 999;
  assert.deepEqual(summaries.getFormattedSummaryForAgent('ana'), full);
  assert.equal(JSON.stringify(full), fullSnapshot);
  assert.equal(JSON.stringify(world), beforeQueries);
  assert.deepEqual(checkpoints.get('ana'), departure);
  const sofiaBefore = summaries.getFormattedSummaryForAgent('sofia');
  checkpoints.register('ana', midnight);
  assert.deepEqual(summaries.getFormattedSummaryForAgent('ana')!.flatMap(item => item.eventIds), ['after-a', 'after-b', 'work']);
  assert.deepEqual(checkpoints.get('sofia'), departure);
  assert.deepEqual(summaries.getFormattedSummaryForAgent('sofia'), sofiaBefore);
  checkpoints.register('ana', { day: 2, hour: 0, minute: 10 });
  assert.deepEqual(summaries.getFormattedSummaryForAgent('ana'), []);
  assert.deepEqual(summaries.getBriefSummaryForAgent('ana'), []);
  console.log('Connection summary G-M: strict cutoff, ties, day boundary, policies, repeated queries and immutable history passed.');

  const real = createActivityDemoSimulation();
  const connections = new LastConnectionRegistry();
  const service = new ActivitySummaryService(real.events);
  const fromConnection = new ActivitySummaryFromConnectionService(connections, service);
  const now = () => ({ day: real.clock.getDay(), hour: real.clock.getHour(), minute: real.clock.getMinute() });
  for (let i = 0; i < 24; i++) real.engine.tick();
  const leftAt = now();
  connections.register('agent-ana', leftAt);
  connections.register('agent-sofia', leftAt);
  for (let i = 0; i < 96; i++) real.engine.tick();
  const captured = now();
  const state = JSON.stringify(real.world);
  const first = fromConnection.getFormattedSummaryForAgent('agent-ana')!;
  assert.equal(first.length, 22);
  assert.deepEqual(fromConnection.getFormattedSummaryForAgent('agent-ana'), first);
  assert.equal(fromConnection.getBriefSummaryForAgent('agent-ana', 8, 'balanced')!.length, 8);
  assert.equal(JSON.stringify(real.world), state);
  assert.deepEqual(now(), captured);
  assert.deepEqual(connections.get('agent-ana'), leftAt);
  // A separate consumer confirms immediately, while the main consumer waits through new ticks.
  const immediate = new LastConnectionRegistry();
  immediate.register('agent-ana', captured);
  assert.deepEqual(new ActivitySummaryFromConnectionService(immediate, service).getFormattedSummaryForAgent('agent-ana'), []);
  for (let i = 0; i < 24; i++) real.engine.tick();
  const stateAfterTicks = JSON.stringify(real.world);
  const sofiaAfterTicks = fromConnection.getFormattedSummaryForAgent('agent-sofia');
  connections.register('agent-ana', captured);
  const after = fromConnection.getFormattedSummaryForAgent('agent-ana')!;
  assert(after.length > 0, 'Normal simulation produces activity after the captured return');
  assert.deepEqual(after, service.getFormattedSummaryForAgent('agent-ana', captured.day, captured.hour, captured.minute));
  const minutes = (moment: ActivitySummaryMoment) => moment.day * 1440 + moment.hour * 60 + moment.minute;
  for (const id of after.flatMap(item => item.eventIds)) {
    assert(minutes(real.world.events.find(item => item.id === id)!) > minutes(captured));
  }
  assert.deepEqual(connections.get('agent-sofia'), leftAt);
  assert.deepEqual(fromConnection.getFormattedSummaryForAgent('agent-sofia'), sofiaAfterTicks);
  assert.equal(JSON.stringify(real.world), stateAfterTicks);
  assert.deepEqual(now(), { day: 1, hour: 20, minute: 0 });

  const originalTick = SimulationEngine.prototype.tick;
  const originalLog = console.log;
  const engines = new Set<SimulationEngine>();
  const output: string[] = [];
  let ticks = 0;
  try {
    SimulationEngine.prototype.tick = function () {
      ticks++;
      engines.add(this);
      return originalTick.call(this);
    };
    console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
    runActivitySessionDemo();
  } finally {
    SimulationEngine.prototype.tick = originalTick;
    console.log = originalLog;
  }
  assert.equal(ticks, 144);
  assert.equal(engines.size, 1);
  assert(output.some(line => line.includes('Consulta 1: corte Día 1 · 18:00 | 26 eventos | 22 items completos | 8 mostrados | 14 omitidos.')));
  assert(output.some(line => line.includes('Mismo resultado; consultar no consumió actividad ni actualizó el registro.')));
  assert(output.some(line => line.includes('Regreso confirmado explícitamente: Día 1 · 18:00.')));
  assert(output.some(line => line.includes(`Consulta 3: Día 1 · 20:00 | ${after.length} items completos`)));
  console.log('Connection real simulation: delayed confirmation preserves later activity, other agent unchanged, demo runs one simulation passed.');
}
