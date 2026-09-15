import assert from 'node:assert/strict';
import { WorldEvent } from '../events/WorldEvent';
import { ActivitySummaryFormatter } from './ActivitySummaryFormatter';

export function runActivitySummaryMoveTests(): void {
  const formatter = new ActivitySummaryFormatter();
  const make = (id: string, type: WorldEvent['type'], minute: number,
    overrides: Partial<WorldEvent> = {}): WorldEvent => ({
    id, type, day: 1, hour: 10, minute, agentIds: ['ana'],
    locationId: 'cafe', description: id, importance: 20, ...overrides,
  });
  const move = make('move', 'AGENT_MOVED', 0);
  const eat = make('eat', 'AGENT_ATE', 5);
  const ids = (events: readonly WorldEvent[]) =>
    formatter.format(events, 'ana').map(item => item.eventIds);
  const relevant: WorldEvent['type'][] = [
    'AGENT_ATE', 'AGENT_RESTED', 'AGENT_WORKED',
    'AGENT_WENT_TO_SLEEP', 'AGENTS_SOCIALIZED',
  ];
  for (const type of relevant) {
    const activity = { ...eat, type, importance: 50 };
    const result = formatter.format([move, activity], 'ana');
    assert.deepEqual(result.map(i => i.eventIds), [['move'], ['eat']]);
    assert.deepEqual(result.map(i => i.importance), [20, 50]);
  }
  console.log('MOVE: arrival before EAT/REST/WORK/SLEEP/SOCIALIZE passed.');

  assert.deepEqual(ids([move]), []);
  assert.deepEqual(ids([{ ...eat, minute: 0 }, { ...move, minute: 5 }]), [['eat']]);
  assert.deepEqual(ids([move, { ...eat, locationId: 'home' }]), [['eat']]);
  assert.deepEqual(ids([{ ...move, locationId: undefined }, eat]), [['eat']]);
  assert.deepEqual(ids([move, { ...eat, locationId: undefined }]), [['eat']]);
  const wake = make('wake', 'AGENT_WOKE_UP', 2);
  assert.deepEqual(ids([move, wake, eat]), [['wake'], ['eat']]);
  assert.deepEqual(ids([move, { ...wake, type: 'AGENT_RESTED', locationId: 'home' }, eat]),
    [['wake'], ['eat']]);
  console.log('MOVE: no future activity, earlier activity, mismatch and missing location passed.');

  const chain = [
    move, make('repeat', 'AGENT_MOVED', 1),
    make('detour', 'AGENT_MOVED', 2, { locationId: 'home' }),
    make('arrival', 'AGENT_MOVED', 3), eat,
  ];
  assert.deepEqual(ids(chain), [['arrival'], ['eat']]);
  assert.deepEqual(ids([move, make('away', 'AGENT_MOVED', 2, { locationId: 'home' }), eat]),
    [['eat']], 'Do not resurrect an older matching destination');
  console.log('MOVE: repeated destinations and unnecessary chains passed.');

  const other = { ...eat, id: 'other', minute: 1, agentIds: ['sofia'] };
  assert.deepEqual(ids([move, other]), [['other']]);
  assert.deepEqual(ids([move, other, eat]), [['move'], ['other'], ['eat']]);
  const otherMove = { ...move, id: 'other-move', minute: 1, agentIds: ['sofia'] };
  const social = { ...eat, id: 'social', type: 'AGENTS_SOCIALIZED' as const, agentIds: ['sofia', 'ana'], importance: 50 };
  assert.deepEqual(ids([move, otherMove, social, { ...social, id: 'social-2' }]),
    [['move'], ['other-move'], ['social'], ['social-2']]);
  console.log('MOVE: agent isolation and both social participants passed.');

  const tiedEat = { ...eat, minute: 0 };
  assert.deepEqual(ids([move, tiedEat]), [['move'], ['eat']]);
  assert.deepEqual(ids([tiedEat, move]), [['eat']]);
  const nightMove = { ...move, hour: 23, minute: 55 };
  const tomorrowEat = { ...eat, day: 2, hour: 0, minute: 5 };
  assert.deepEqual(ids([tomorrowEat, nightMove]), [['move'], ['eat']]);
  console.log('MOVE: stable ties, chronological sorting and day boundary passed.');

  const work1 = make('work1', 'AGENT_WORKED', 0, { locationId: 'work' });
  const useless = make('useless', 'AGENT_MOVED', 1);
  const work2 = { ...work1, id: 'work2', minute: 2 };
  assert.deepEqual(ids([work1, useless, work2]), [['work1'], ['work2']],
    'Omitted MOVE must still interrupt consecutive WORK');
  const sleep = make('sleep', 'AGENT_WENT_TO_SLEEP', 3, { importance: 30 });
  assert.deepEqual(ids([move, sleep, { ...wake, day: 2 }]), [['move'], ['sleep', 'wake']]);
  console.log('MOVE: WORK boundaries and SLEEP/WAKE grouping preserved.');

  const input = [...chain, otherMove, social, { ...social, id: 'social-2' }].reverse();
  const snapshot = JSON.stringify(input);
  for (const event of input) { Object.freeze(event.agentIds); Object.freeze(event); }
  Object.freeze(input);
  const first = formatter.format(input, 'ana');
  const again = formatter.format(input, 'ana');
  assert.deepEqual(first, again);
  const represented = first.flatMap(i => i.eventIds);
  assert.equal(new Set(represented).size, represented.length);
  for (const event of input.filter(e => e.type !== 'AGENT_MOVED')) {
    assert(represented.includes(event.id), 'All non-MOVE events remain represented');
  }
  assert(!represented.includes('move') && !represented.includes('repeat') &&
    !represented.includes('detour'));
  first[0].eventIds.push('edited');
  first[0].importance = -1;
  assert.equal(JSON.stringify(input), snapshot);
  assert.deepEqual(formatter.format(input, 'ana'), again);
  console.log('MOVE: exact eventIds, original importance and immutable inputs passed.');
}
