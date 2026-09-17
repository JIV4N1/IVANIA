import assert from 'node:assert/strict';
import { ActivitySummaryItem } from './ActivitySummaryItem';
import { activityCategory, ActivitySummarySelector } from './ActivitySummarySelector';

export function runActivitySummaryBalancedTests(): void {
  const make = (id: string, time: number, importance = 50, type = 'AGENTS_SOCIALIZED'): ActivitySummaryItem => ({
    type, title: 'Same title', description: 'Same description', importance, eventIds: [id],
    startDay: Math.floor(time / 1440), startHour: Math.floor(time % 1440 / 60), startMinute: time % 60,
    endDay: 99, endHour: 23, endMinute: 59,
  });
  const selector = new ActivitySummarySelector();
  const ids = (items: ActivitySummaryItem[]) => items.map(item => item.eventIds[0]);
  const balanced = (items: ActivitySummaryItem[], limit = 8) => selector.select(items, limit, 'balanced');
  const social = Array.from({ length: 12 }, (_, i) => make(`social-${i}`, 1440 + i * 60));
  const sleep = make('sleep', 2760, 30, 'AGENT_WENT_TO_SLEEP');
  sleep.eventIds.push('wake'); // Already formatted cycle: one item, one SLEEP reservation.
  const fixture = [...social, sleep, make('work', 3420, 25, 'AGENT_WORKED'),
    make('eat', 3600, 20, 'AGENT_ATE'), make('rest', 3720, 10, 'AGENT_RESTED')];
  const snapshot = JSON.stringify(fixture);
  fixture.forEach(item => { Object.freeze(item.eventIds); Object.freeze(item); });
  Object.freeze(fixture);
  const chosen = balanced(fixture);
  assert.equal(chosen.length, 8);
  assert.deepEqual(new Set(chosen.map(activityCategory)), new Set(['SOCIAL', 'SLEEP', 'WORK', 'EAT', 'REST']));
  assert.equal(new Set(chosen).size, chosen.length);
  for (const item of chosen) assert(fixture.includes(item));
  assert.equal(chosen.find(item => activityCategory(item) === 'REST')!.importance, 10);
  assert.equal(JSON.stringify(fixture), snapshot);
  const previous = ['social-0', 'social-1', 'social-2', 'social-3', 'social-4', 'social-5', 'social-8', 'social-11'];
  assert.deepEqual(ids(selector.select(fixture)), previous);
  assert.deepEqual(ids(selector.select(fixture, 8, 'important')), previous);

  const categories = [make('rest', 1, 50, 'AGENT_RESTED'), make('eat', 2, 50, 'AGENT_ATE'),
    make('work', 3, 50, 'AGENT_WORKED'), make('wake', 4, 50, 'AGENT_WOKE_UP'), make('social', 5)];
  for (let limit = 1; limit < 5; limit++) {
    assert.deepEqual(ids(balanced(categories, limit)), ['social', 'wake', 'work', 'eat'].slice(0, limit).reverse());
  }
  assert.deepEqual(ids(balanced([make('rest', 1, 60, 'AGENT_RESTED'), ...categories], 1)), ['rest']);
  // Priority order applies even when all categories fit; the SOCIAL anchor determines SLEEP.
  const coverage = [make('social', 1500, 80), make('sleep-near', 1501, 40, 'AGENT_WOKE_UP'),
    make('sleep-far', 2881, 40, 'AGENT_WENT_TO_SLEEP'), make('sleep-low', 6000, 39, 'AGENT_WOKE_UP'),
    make('work-early', 1800, 30, 'AGENT_WORKED'), make('work-far', 2100, 30, 'AGENT_WORKED')];
  assert.deepEqual(ids(balanced(coverage, 3)), ['social', 'work-far', 'sleep-far']);
  // Both phase A anchors must influence phase B: without SLEEP, social-near-sleep would win.
  const anchors = [make('social-first', 0), make('social-middle', 50), make('social-near-sleep', 99),
    make('sleep', 100, 20, 'AGENT_WOKE_UP')];
  assert.deepEqual(ids(balanced(anchors, 3)), ['social-first', 'social-middle', 'sleep']);
  assert.deepEqual(ids(balanced([make('anchor', 60, 60), make('later', 90, 40, 'AGENT_ATE'),
    make('earlier-first', 30, 40, 'AGENT_ATE'), make('earlier-second', 30, 40, 'AGENT_ATE')], 2)),
  ['earlier-first', 'anchor']);

  const moves = [make('social', 0), make('move-high', 1, 90, 'AGENT_MOVED'),
    make('move-low', 2, 50, 'AGENT_MOVED'), make('rest', 3, 1, 'AGENT_RESTED')];
  assert.deepEqual(ids(balanced(moves, 2)), ['social', 'rest']);
  assert.deepEqual(ids(balanced(moves, 3)), ['social', 'move-high', 'rest']);
  assert.deepEqual(ids(balanced([make('a', 0), make('move', 100, 50, 'AGENT_MOVED'),
    make('b', 1), make('c', 2)], 2)), ['a', 'c']);
  assert.deepEqual(ids(balanced([make('m1', 0, 1, 'AGENT_MOVED'),
    make('m2', 20, 1, 'AGENT_MOVED'), make('m3', 10, 1, 'AGENT_MOVED')], 2)), ['m1', 'm2']);

  const coincident = [make('second', 1441), make('first', 1441), make('yesterday', 1439), make('later', 1442)];
  assert.deepEqual(ids(balanced(coincident, 3)), ['yesterday', 'second', 'later']);
  assert.deepEqual(ids(balanced(coincident)), ['yesterday', 'second', 'first', 'later']);
  assert.deepEqual(ids(balanced(coincident.slice(0, 2), 1)), ['second']);
  assert.deepEqual(ids(balanced([make('social-a', 0), make('social-b', 0),
    make('low-social', 50, 1), make('sleep', 100, 20, 'AGENT_WOKE_UP')], 3)),
  ['social-a', 'social-b', 'sleep']);
  assert.deepEqual(balanced([]), []);
  assert.deepEqual(balanced(fixture, 0), []);
  for (const invalid of [-1, 0.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => balanced(fixture, invalid), RangeError);
    assert.throws(() => balanced([], invalid), RangeError);
  }
  console.log('Balanced selection: representation, importance, coverage, MOVE, ties, identity and immutability passed.');
}
