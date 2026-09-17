import assert from 'node:assert/strict';
import { World } from '../world/World';
import { WorldEvent } from '../events/WorldEvent';
import { EventManager } from '../events/EventManager';
import { SimulationClock } from '../simulation/SimulationClock';
import { ActivitySummaryFromConnectionService } from './ActivitySummaryFromConnectionService';
import { ActivitySummaryFormatter } from './ActivitySummaryFormatter';
import { ActivitySummarySelector, ActivitySummarySelection } from './ActivitySummarySelector';
import { ActivitySummaryMoment } from './ActivitySummaryPresenter';
import { LastConnectionRegistry } from './LastConnectionRegistry';
import { ActivitySummaryService } from './ActivitySummaryService';
import { createActivityDemoSimulation } from './createActivityDemoSimulation';

export function runActivitySummaryAtTests(): void {
  const moment = (day: number, hour = 0, minute = 0) => ({ day, hour, minute });
  const event = (id: string, at: ActivitySummaryMoment, type: WorldEvent['type'] = 'AGENTS_SOCIALIZED',
    agentIds = ['ana']): WorldEvent => ({ id, ...at, type, agentIds, locationId: 'home',
    description: 'Activity at Casa.', importance: type === 'AGENTS_SOCIALIZED' ? 50 : 20 });
  const setup = (events: WorldEvent[], from = moment(1, 9)) => {
    const world = new World('Bounded query', [], [], events);
    const registry = new LastConnectionRegistry();
    registry.register('ana', from);
    const explicit = new ActivitySummaryService(new EventManager(world, new SimulationClock()));
    return { world, registry, explicit, service: new ActivitySummaryFromConnectionService(registry, explicit) };
  };
  const fixture = setup([
    event('before', moment(1, 23, 50)), event('from', moment(1, 23, 55)),
    event('to-a', moment(2)), event('to-b', moment(2)),
    event('other', moment(2), 'AGENT_ATE', ['sofia']), event('after', moment(2, 0, 5)),
  ], moment(1, 23, 55));
  const { service, registry, world, explicit } = fixture;
  const to = moment(2);
  assert.equal(service.getSummaryAt('unknown', to), undefined);
  assert.equal(registry.get('unknown'), undefined);
  const before = JSON.stringify(world);
  const result = service.getSummaryAt('ana', to)!;
  assert.deepEqual(result.completeItems.flatMap(item => item.eventIds), ['to-a', 'to-b']);
  assert.equal(result.agentId, 'ana');
  assert.deepEqual(result.from, moment(1, 23, 55));
  assert.deepEqual(result.to, to);
  assert.equal(result.totalEvents, 2);
  assert.equal(result.totalItems, 2);
  assert.equal(result.selectedCount, 2);
  assert.equal(result.omittedCount, 0);
  assert.equal(result.maxItems, 8);
  assert.equal(result.selectionPolicy, 'important');
  assert.deepEqual(service.getSummaryAt('ana', to), result);
  assert.equal(JSON.stringify(world), before);
  assert.deepEqual(registry.get('ana'), moment(1, 23, 55));
  const empty = service.getSummaryAt('ana', result.from)!;
  assert.deepEqual([empty.completeItems, empty.selectedItems, empty.totalEvents, empty.totalItems,
    empty.selectedCount, empty.omittedCount], [[], [], 0, 0, 0, 0]);
  assert.throws(() => service.getSummaryAt('ana', moment(1, 23, 50)), RangeError);
  for (const invalid of [moment(0), moment(1.5), moment(Infinity), moment(2, 24),
    moment(2, -1), moment(2, NaN), moment(2, 0, 60), moment(2, 0, 1), moment(2, 0, 2.5)]) {
    assert.throws(() => service.getSummaryAt('ana', invalid), RangeError);
  }
  // Old APIs still have no upper bound, and preserve their existing filtering and defaults.
  assert.deepEqual(explicit.getSummaryForAgent('ana', 1, 23, 55).events.map(e => e.id), ['to-a', 'to-b', 'after']);
  assert.equal(explicit.getImportantEvents('ana', 1, 23, 55).length, 3);
  assert.deepEqual(service.getFormattedSummaryForAgent('ana'), explicit.getFormattedSummaryForAgent('ana', 1, 23, 55));
  assert.deepEqual(service.getBriefSummaryForAgent('ana'), explicit.getBriefSummaryForAgent('ana', 1, 23, 55));

  const work = setup([event('w10', moment(1, 10), 'AGENT_WORKED'), event('w11', moment(1, 11), 'AGENT_WORKED')]);
  const partial = work.service.getSummaryAt('ana', moment(1, 10, 30))!;
  assert.equal(partial.totalEvents, 1);
  assert.deepEqual(partial.completeItems[0].eventIds, ['w10']);
  assert.equal(partial.completeItems[0].endHour, 10);
  assert.equal(partial.completeItems[0].endMinute, 0);
  assert.deepEqual(work.service.getFormattedSummaryForAgent('ana')![0].eventIds, ['w10', 'w11']);
  const sleep = setup([event('sleep', moment(1, 23), 'AGENT_WENT_TO_SLEEP'),
    event('wake', moment(2, 7), 'AGENT_WOKE_UP')], moment(1, 22));
  const sleeping = sleep.service.getSummaryAt('ana', moment(2))!;
  assert.deepEqual(sleeping.completeItems[0].eventIds, ['sleep']);
  assert.equal(sleeping.completeItems[0].endDay, 1);
  assert.equal(sleeping.completeItems[0].endHour, 23);
  assert.match(sleeping.completeItems[0].description, /Te dormiste/);
  assert.deepEqual(sleep.service.getSummaryAt('ana', moment(2, 7))!.completeItems[0].eventIds, ['sleep', 'wake']);
  const move = setup([event('move', moment(1, 10), 'AGENT_MOVED'), event('rest', moment(1, 11), 'AGENT_RESTED')]);
  const moving = move.service.getSummaryAt('ana', moment(1, 10, 30))!;
  assert.equal(moving.totalEvents, 1);
  assert.equal(moving.totalItems, 0);
  assert.equal(move.service.getSummaryAt('ana', moment(1, 11))!.totalItems, 2);

  const many = setup([...Array.from({ length: 10 }, (_, i) => event(`s${i}`, moment(1, 10, i * 5))),
    event('rest', moment(1, 11), 'AGENT_RESTED')]);
  for (const policy of ['important', 'balanced'] as const) {
    for (const max of [0, 1, 2, 8, 20]) {
      const query = many.service.getSummaryAt('ana', moment(1, 12), max, policy)!;
      assert.equal(query.totalEvents, 11);
      assert.equal(query.totalItems, query.completeItems.length);
      assert.equal(query.selectedCount, query.selectedItems.length);
      assert.equal(query.omittedCount, query.totalItems - query.selectedCount);
      assert.equal(query.maxItems, max);
      assert.equal(query.selectionPolicy, policy);
      assert(query.selectedItems.every(item => query.completeItems.includes(item)));
      assert.deepEqual(query.selectedItems, many.explicit.getBriefSummaryForAgent('ana', 1, 9, 0, max, policy));
    }
    for (const invalid of [-1, 1.5, NaN, Infinity]) {
      assert.throws(() => many.service.getSummaryAt('ana', moment(1, 12), invalid, policy), RangeError);
      assert.throws(() => service.getSummaryAt('ana', result.from, invalid, policy), RangeError);
    }
  }
  assert.throws(() => service.getSummaryAt('ana', to, 0, 'unknown' as ActivitySummarySelection), RangeError);
  assert(many.service.getSummaryAt('ana', moment(1, 12), 2, 'balanced')!.selectedItems.some(item => item.type === 'AGENT_RESTED'));
  // Instrument only to verify the required single read, single formatting pass, and shared items.
  const originalGet = registry.get;
  const originalFormat = ActivitySummaryFormatter.prototype.format;
  const originalSelect = ActivitySummarySelector.prototype.select;
  let reads = 0;
  let formats = 0;
  let formatted: ReturnType<typeof originalFormat> | undefined;
  try {
    registry.get = function (id) { reads++; return originalGet.call(this, id); };
    ActivitySummaryFormatter.prototype.format = function (...args) {
      formats++;
      formatted = originalFormat.apply(this, args);
      return formatted;
    };
    ActivitySummarySelector.prototype.select = function (items, ...args) {
      assert.equal(items, formatted);
      return originalSelect.call(this, items, ...args);
    };
    service.getSummaryAt('ana', to);
    assert.equal(reads, 1);
    assert.equal(formats, 1);
  } finally {
    registry.get = originalGet;
    ActivitySummaryFormatter.prototype.format = originalFormat;
    ActivitySummarySelector.prototype.select = originalSelect;
  }
  const snapshot = JSON.stringify(result);
  to.hour = 1;
  world.events.push(event('new', moment(2, 0, 10)));
  registry.register('ana', result.to);
  assert.equal(JSON.stringify(result), snapshot);
  assert.deepEqual(service.getSummaryAt('ana', moment(2, 0, 10))!.completeItems.flatMap(item => item.eventIds), ['after', 'new']);
  const next = service.getSummaryAt('ana', moment(2, 0, 10))!;
  const nextSnapshot = JSON.stringify(next);
  const historySnapshot = JSON.stringify(world);
  next.from.day = 99;
  next.to.hour = 23;
  next.selectedItems[0].eventIds.push('fake');
  next.completeItems[0].description = 'changed';
  next.completeItems.pop();
  assert.equal(JSON.stringify(world), historySnapshot);
  assert.deepEqual(registry.get('ana'), moment(2));
  assert.equal(JSON.stringify(service.getSummaryAt('ana', moment(2, 0, 10))), nextSnapshot);
  console.log('Bounded summary A-M,O: boundaries, pre-group filtering, counts, policies, single pass and detached results passed.');

  const real = createActivityDemoSimulation();
  const connections = new LastConnectionRegistry();
  const summaries = new ActivitySummaryFromConnectionService(connections, new ActivitySummaryService(real.events));
  for (let i = 0; i < 24; i++) real.engine.tick();
  connections.register('agent-ana', moment(1, 10));
  connections.register('agent-sofia', moment(1, 10));
  for (let i = 0; i < 96; i++) real.engine.tick();
  const cutoff = { day: real.clock.getDay(), hour: real.clock.getHour(), minute: real.clock.getMinute() };
  for (let i = 0; i < 24; i++) real.engine.tick();
  const current = { day: real.clock.getDay(), hour: real.clock.getHour(), minute: real.clock.getMinute() };
  const state = JSON.stringify(real.world);
  const first = summaries.getSummaryAt('agent-ana', cutoff, 8, 'balanced')!;
  assert.deepEqual([first.totalEvents, first.totalItems, first.selectedCount], [26, 22, 8]);
  assert.deepEqual(summaries.getSummaryAt('agent-ana', cutoff, 8, 'balanced'), first);
  const firstIds = new Set(first.completeItems.flatMap(item => item.eventIds));
  const laterEvents = real.world.events.filter(e => e.agentIds.includes('agent-ana') && e.hour > 18);
  assert.equal(laterEvents.length, 2);
  assert(laterEvents.every(e => !firstIds.has(e.id)));
  const sofia = summaries.getSummaryAt('agent-sofia', current);
  connections.register('agent-ana', first.to);
  const after = summaries.getSummaryAt('agent-ana', current)!;
  assert.deepEqual(after.completeItems.flatMap(item => item.eventIds), laterEvents.map(e => e.id));
  assert.deepEqual([after.totalEvents, after.totalItems, after.selectedCount], [2, 2, 2]);
  assert.deepEqual(summaries.getSummaryAt('agent-sofia', current), sofia);
  assert.deepEqual(connections.get('agent-sofia'), moment(1, 10));
  assert.equal(JSON.stringify(real.world), state);
  assert.deepEqual([real.clock.getDay(), real.clock.getHour(), real.clock.getMinute()], [1, 20, 0]);
  console.log('Bounded summary N: real query at 20:00 with cutoff 18:00 excludes later activity; explicit confirmation preserves both later events passed.');
}
