import assert from 'node:assert/strict';
import { World } from '../world/World';
import { WorldEvent } from '../events/WorldEvent';
import { EventManager } from '../events/EventManager';
import { SimulationClock } from '../simulation/SimulationClock';
import { ActivitySummaryService } from './ActivitySummaryService';
import { runActivitySummaryDemo } from './demoActivitySummary';

export function runActivitySummaryTests(): void {
  const make = (id: string, day: number, hour: number, minute: number,
    importance = 20, agentIds = ['ana']): WorldEvent => ({
    id, day, hour, minute, importance, agentIds,
    type: importance === 50 ? 'AGENTS_SOCIALIZED' : 'AGENT_ATE', description: id,
  });
  const history = [
    make('next-day', 2, 0, 0),
    make('social', 1, 14, 10, 50, ['sofia', 'ana']),
    make('before', 1, 9, 55),
    make('equal-cutoff', 1, 10, 0),
    make('other-agent', 1, 12, 0, 50, ['sofia']),
    make('first-after', 1, 10, 5, 39),
    make('threshold', 1, 12, 30, 40),
    make('same-time', 1, 14, 10),
  ];
  const world = new World('Activity tests', [], [], history);
  const service = new ActivitySummaryService(new EventManager(world, new SimulationClock()));
  const before = JSON.stringify(world);

  // A: no matching activity, including an unknown agent and a future cutoff.
  assert.deepEqual(service.getSummaryForAgent('missing', 1, 10, 0), {
    agentId: 'missing', fromDay: 1, fromHour: 10, fromMinute: 0,
    events: [], totalEvents: 0, importantEvents: 0,
  });
  assert.equal(service.getSummaryForAgent('ana', 3, 0, 0).totalEvents, 0);
  assert.deepEqual(service.getImportantEvents('missing', 1, 10, 0), []);
  const empty = new ActivitySummaryService(new EventManager(new World('Empty'), new SimulationClock()));
  assert.equal(empty.getSummaryForAgent('ana', 1, 10, 0).events.length, 0);

  const summary = service.getSummaryForAgent('ana', 1, 10, 0);
  // B/C/E: strict cutoff, participant filtering, chronological order across days.
  assert.deepEqual(summary.events.map(event => event.id), [
    'first-after', 'threshold', 'social', 'same-time', 'next-day',
  ]);
  assert.equal(summary.agentId, 'ana');
  assert.equal(summary.fromDay, 1);
  assert.equal(summary.fromHour, 10);
  assert.equal(summary.fromMinute, 0);
  assert.equal(summary.totalEvents, 5);
  assert.equal(service.getSummaryForAgent('ana', 1, 10, 5).totalEvents, 4);
  assert.deepEqual(service.getSummaryForAgent('ana', 1, 23, 55).events.map(event => event.id), ['next-day']);
  // D: social importance 50 is included; 40 is inclusive and 39 excluded.
  assert.equal(summary.importantEvents, 2);
  assert.deepEqual(service.getImportantEvents('ana', 1, 10, 0).map(event => event.id), ['threshold', 'social']);
  assert.equal(JSON.stringify(world), before, 'Queries never change or reorder history');
  summary.events[0].description = 'edited';
  summary.events[0].agentIds.push('intruder');
  summary.events.reverse();
  const important = service.getImportantEvents('ana', 1, 10, 0);
  important[0].importance = 0;
  assert.equal(JSON.stringify(world), before, 'Results are detached from history');

  const log = console.log;
  let demo: ReturnType<typeof runActivitySummaryDemo>;
  try { console.log = () => {}; demo = runActivitySummaryDemo(); }
  finally { console.log = log; }
  assert.equal(demo.fromDay, 1);
  assert.equal(demo.fromHour, 10);
  assert.equal(demo.fromMinute, 0);
  assert(demo.totalEvents > 0);
  assert(demo.events.every(event => event.agentIds.includes('agent-ana') && event.day === 1 &&
    event.hour * 60 + event.minute > 600 && event.hour * 60 + event.minute <= 1080));
  assert.equal(demo.totalEvents, demo.events.length);
  assert.equal(demo.importantEvents, demo.events.filter(event => event.importance >= 40).length);
  console.log('Activity summary A-E, history isolation and demo tests passed.');
}
