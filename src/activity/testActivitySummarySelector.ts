import assert from 'node:assert/strict';
import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummarySelector } from './ActivitySummarySelector';
import { ActivitySummaryService } from './ActivitySummaryService';
import { World } from '../world/World';
import { EventManager } from '../events/EventManager';
import { SimulationClock } from '../simulation/SimulationClock';

export function runActivitySummarySelectorTests(): void {
  const make = (id: string, hour: number, importance: number,
    type = 'AGENT_ATE', minute = 0, day = 1): ActivitySummaryItem => ({
    type, title: id, description: id, startDay: day, startHour: hour, startMinute: minute,
    endDay: day, endHour: hour, endMinute: minute, eventIds: [id], importance,
  });
  const titles = (items: ActivitySummaryItem[]) => items.map(i => i.title);
  const selector = new ActivitySummarySelector();
  assert.deepEqual(selector.select([]), []);
  const small = [make('a', 9, 1), make('b', 8, 2)];
  assert.deepEqual(titles(selector.select(small, 8)), ['b', 'a']);
  assert.deepEqual(selector.select(small, 0), []);
  for (const invalid of [-1, 1.5, NaN, Infinity]) {
    assert.throws(() => selector.select(small, invalid), RangeError);
  }
  assert.deepEqual(titles(selector.select(small)), ['b', 'a']);
  console.log('Selector K: empty, under limit, default, zero and invalid limits passed.');

  const ranked = [make('low', 6, 10), make('high', 12, 90), make('middle', 9, 50)];
  assert.deepEqual(titles(selector.select(ranked, 1)), ['high']);
  assert.deepEqual(titles(selector.select(ranked, 2)), ['middle', 'high']);
  assert.deepEqual(titles(selector.select([
    make('move', 17, 50, 'AGENT_MOVED'), make('activity', 8, 50),
  ], 1)), ['activity']);
  assert.deepEqual(titles(selector.select([
    make('high-move', 12, 60, 'AGENT_MOVED'), make('low-activity', 8, 50),
  ], 1)), ['high-move']);
  assert.deepEqual(titles(selector.select([
    make('high-a', 9, 60), make('high-b', 10, 60), make('low', 17, 50),
  ], 3)), ['high-a', 'high-b', 'low']);
  console.log('Selector A-C: importance, activity over MOVE and complete groups passed.');

  const spread = [make('17', 17, 50), make('10', 10, 50),
    make('09', 9, 50), make('13', 13, 50)];
  assert.deepEqual(titles(selector.select(spread, 3)), ['09', '13', '17']);
  assert.deepEqual(titles(selector.select(spread, 1)), ['09']);
  assert.deepEqual(titles(selector.select([
    make('priority', 10, 90), make('near', 11, 50), make('far', 17, 50),
  ], 2)), ['priority', 'far']);
  console.log('Selector D-F: oldest start, farthest next and priority anchors passed.');

  assert.deepEqual(titles(selector.select([
    make('anchor', 12, 90), make('later', 15, 50), make('earlier', 9, 50),
  ], 2)), ['earlier', 'anchor']);
  const tied = [make('second', 10, 50), make('first', 10, 50), make('later', 11, 50)];
  assert.deepEqual(titles(selector.select(tied, 1)), ['second']);
  assert.deepEqual(titles(selector.select([
    make('d2', 1, 50, 'AGENT_ATE', 0, 2), make('d1', 23, 50),
    make('d2-later', 2, 50, 'AGENT_ATE', 0, 2),
  ], 3)), ['d1', 'd2', 'd2-later']);
  const social = [make('social-1', 9, 50, 'AGENTS_SOCIALIZED'),
    make('social-2', 9, 50, 'AGENTS_SOCIALIZED')];
  assert.deepEqual(selector.select(social, 2).map(i => i.eventIds), [['social-1'], ['social-2']]);
  console.log('Selector G-I: distance ties, day boundaries and individual social events passed.');
  const snapshot = JSON.stringify(ranked);
  for (const item of ranked) { Object.freeze(item.eventIds); Object.freeze(item); }
  Object.freeze(ranked);
  const selected = selector.select(ranked, 2);
  assert.equal(JSON.stringify(ranked), snapshot);
  assert.equal(selected[0], ranked[2]);
  assert.deepEqual(selected[0].eventIds, ['middle']);
  console.log('Selector J: immutable items and eventIds passed.');

  const world = new World('Selector tests', [], [], [
    { id: 'e1', type: 'AGENT_ATE', day: 1, hour: 9, minute: 0,
      agentIds: ['ana'], importance: 20, description: 'Ana ate at Cafe.' },
    { id: 'e2', type: 'AGENTS_SOCIALIZED', day: 1, hour: 10, minute: 0,
      agentIds: ['ana', 'sofia'], importance: 50, description: 'Ana socialized with Sofia at Cafe.' },
  ]);
  const service = new ActivitySummaryService(new EventManager(world, new SimulationClock()));
  const full = service.getFormattedSummaryForAgent('ana', 1, 8, 0);
  assert.equal(full.length, 2);
  assert.deepEqual(service.getBriefSummaryForAgent('ana', 1, 8, 0, 1), selector.select(full, 1));
  assert.equal(service.getFormattedSummaryForAgent('ana', 1, 8, 0).length, 2);
  assert.equal(service.getSummaryForAgent('ana', 1, 8, 0).totalEvents, 2);
  console.log('Selector: service integration and complete summary preservation passed.');
}
