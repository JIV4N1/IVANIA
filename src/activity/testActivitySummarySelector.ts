import assert from 'node:assert/strict';
import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummarySelector } from './ActivitySummarySelector';
import { ActivitySummaryService } from './ActivitySummaryService';
import { World } from '../world/World';
import { EventManager } from '../events/EventManager';
import { SimulationClock } from '../simulation/SimulationClock';

export function runActivitySummarySelectorTests(): void {
  const make = (id: string, hour: number, importance: number,
    type = 'AGENT_ATE', minute = 0): ActivitySummaryItem => ({
    type, title: id, description: id, startDay: 1, startHour: hour, startMinute: minute,
    endDay: 1, endHour: hour, endMinute: minute, eventIds: [id], importance,
  });
  const selector = new ActivitySummarySelector();
  assert.deepEqual(selector.select([]), []);
  const small = [make('a', 9, 1), make('b', 8, 2)];
  assert.deepEqual(selector.select(small, 8), small);
  assert.deepEqual(selector.select(small, 0), []);
  for (const invalid of [-1, 1.5, NaN, Infinity]) {
    assert.throws(() => selector.select(small, invalid), RangeError);
  }
  console.log('Selector A/I: empty, under limit, zero and invalid limits passed.');

  const ranked = [make('low', 8, 10), make('move', 12, 50, 'AGENT_MOVED'),
    make('old', 9, 50), make('recent', 11, 50), make('high', 10, 90)];
  assert.deepEqual(selector.select(ranked, 3).map(i => i.title), ['old', 'high', 'recent']);
  assert.equal(selector.select(ranked, 2).length, 2);
  assert.deepEqual(selector.select([make('move', 12, 50, 'AGENT_MOVED'), make('activity', 8, 50)], 1)
    .map(i => i.title), ['activity']);
  assert.deepEqual(selector.select([make('old', 8, 50), make('new', 9, 50)], 1)
    .map(i => i.title), ['new']);
  console.log('Selector B-F: limit, importance, activity, recency and chronological order passed.');

  const tied = [make('first', 10, 50), make('second', 10, 50), make('third', 10, 50)];
  assert.deepEqual(selector.select(tied, 2).map(i => i.title), ['first', 'second']);
  const social = [make('social-1', 9, 50, 'AGENTS_SOCIALIZED'),
    make('social-2', 10, 50, 'AGENTS_SOCIALIZED')];
  assert.deepEqual(selector.select(social, 2).map(i => i.eventIds), [['social-1'], ['social-2']]);
  const snapshot = JSON.stringify(ranked);
  for (const item of ranked) { Object.freeze(item.eventIds); Object.freeze(item); }
  Object.freeze(ranked);
  const selected = selector.select(ranked, 3);
  assert.equal(JSON.stringify(ranked), snapshot);
  assert.equal(selected[0], ranked[2]);
  assert.deepEqual(selected[0].eventIds, ['old']);
  console.log('Selector F-H: stable ties, separate social items and immutable inputs passed.');

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
  console.log('Selector J: service integration and complete summary preservation passed.');
}
