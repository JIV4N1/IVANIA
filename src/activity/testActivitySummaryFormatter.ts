import assert from 'node:assert/strict';
import { WorldEvent } from '../events/WorldEvent';
import { ActivitySummaryFormatter } from './ActivitySummaryFormatter';
import { ActivitySummaryService } from './ActivitySummaryService';
import { World } from '../world/World';
import { EventManager } from '../events/EventManager';
import { SimulationClock } from '../simulation/SimulationClock';

export function runActivitySummaryFormatterTests(): void {
  const make = (id: string, type: WorldEvent['type'], hour: number,
    overrides: Partial<WorldEvent> = {}): WorldEvent => ({
    id, type, hour, day: 1, minute: 0, agentIds: ['ana'], importance: 20,
    description: 'Ana worked at Trabajo.', ...overrides,
  });
  const formatter = new ActivitySummaryFormatter();
  const work = [9, 10, 11, 12].map((hour, i) =>
    make('work-' + i, 'AGENT_WORKED', hour, { importance: 20 + i }));
  const a = formatter.format(work);
  assert.equal(a.length, 1);
  assert.deepEqual(a[0].eventIds, work.map(e => e.id));
  assert.equal(a[0].startHour, 9);
  assert.equal(a[0].endHour, 12);
  assert.equal(a[0].importance, 23);
  console.log('Formatter A: 4 WORK -> 1 item passed.');

  const eat = make('eat', 'AGENT_ATE', 10, { minute: 30, description: 'Ana ate at Cafetería.' });
  const b = formatter.format([...work, eat]);
  assert.deepEqual(b.map(i => i.type), ['AGENT_WORKED', 'AGENT_ATE', 'AGENT_WORKED']);
  assert.equal(b[1].description, 'Comiste en Cafetería.');
  assert.equal(b[2].description, 'Regresaste al trabajo.');
  assert.equal(formatter.format([work[0], { ...work[1], agentIds: ['sofia'] }]).length, 2);
  console.log('Formatter B: WORK separated by EAT -> 2 blocks passed.');

  const social = make('social', 'AGENTS_SOCIALIZED', 10, {
    minute: 30, importance: 50, agentIds: ['sofia', 'ana'],
    description: 'Sofía socialized with Ana at Cafetería.',
  });
  const c = formatter.format([...work, social, { ...social, id: 'social-2', minute: 35 }], 'ana');
  assert.equal(c.length, 4);
  assert.deepEqual(c.slice(1, 3).map(i => i.importance), [50, 50]);
  assert.equal(c[1].description, 'Socializaste con Sofía en Cafetería.');
  console.log('Formatter C: social interactions stay individual and important passed.');

  const sleep = make('sleep', 'AGENT_WENT_TO_SLEEP', 23, {
    minute: 5, description: 'Ana went to sleep at Casa.', importance: 30,
  });
  const wake = make('wake', 'AGENT_WOKE_UP', 7, { day: 2, importance: 40 });
  const d = formatter.format([sleep, wake]);
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].eventIds, ['sleep', 'wake']);
  assert.equal(d[0].description, 'Dormiste en Casa.');
  assert.equal(d[0].startDay, 1);
  assert.equal(d[0].endDay, 2);
  assert.equal(d[0].endHour, 7);
  assert.equal(d[0].importance, 40);
  assert.equal(formatter.format([sleep])[0].description, 'Te dormiste en Casa.');
  assert.deepEqual(formatter.format([wake])[0].eventIds, ['wake']);
  assert.equal(formatter.format([sleep, { ...wake, agentIds: ['sofia'] }]).length, 2);
  console.log('Formatter D: SLEEP + WAKE across midnight -> 1 item passed.');

  const input = [wake, social, eat, ...work.slice().reverse(), sleep];
  const before = JSON.stringify(input);
  for (const event of input) { Object.freeze(event.agentIds); Object.freeze(event); }
  Object.freeze(input);
  const e = formatter.format(input, 'ana');
  assert.deepEqual(e.map(i => i.eventIds[0]), ['work-0', 'social', 'eat', 'work-2', 'sleep']);
  assert.deepEqual(formatter.format([], 'ana'), []);
  console.log('Formatter E: chronological order and stable ties passed.');
  e[0].eventIds.push('changed');
  e[0].description = 'changed';
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(formatter.format(input, 'ana'), formatter.format(input, 'ana'));
  const world = new World('Formatter tests', [], [], [...input]);
  const service = new ActivitySummaryService(new EventManager(world, new SimulationClock()));
  assert.deepEqual(service.getFormattedSummaryForAgent('ana', 1, 10, 0),
    formatter.format(service.getSummaryForAgent('ana', 1, 10, 0).events, 'ana'));
  assert.deepEqual(service.getFormattedSummaryForAgent('missing', 1, 0, 0), []);
  assert.equal(JSON.stringify(input), before);
  console.log('Formatter F: original events unchanged and service integration passed.');
}
