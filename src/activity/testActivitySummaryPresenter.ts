import assert from 'node:assert/strict';
import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummaryPresenter } from './ActivitySummaryPresenter';
import { runActivitySummaryDemo } from './demoActivitySummary';
import { ActivitySummaryFormatter } from './ActivitySummaryFormatter';
import { ActivitySummarySelector } from './ActivitySummarySelector';
import { SimulationEngine } from '../simulation/SimulationEngine';

export function runActivitySummaryPresenterTests(): void {
  const make = (id: string, day: number, hour: number, minute: number,
    endDay = day, endHour = hour, endMinute = minute): ActivitySummaryItem => ({
    type: 'AGENT_ATE', title: 'Comida', description: id,
    startDay: day, startHour: hour, startMinute: minute,
    endDay, endHour, endMinute, eventIds: [`event-${id}`], importance: 50,
  });
  const presenter = new ActivitySummaryPresenter();
  const last = { day: 1, hour: 9, minute: 5 };
  const query = { day: 1, hour: 18, minute: 0 };
  const items = [make('Puntual', 1, 9, 7), make('Intervalo', 1, 10, 0, 1, 11, 5)];
  const normal = presenter.present(items, 22, last, query);
  assert.equal(normal, [
    'Mientras estabas fuera...', 'Día 1 · 09:05–18:00', '',
    '09:07 | Puntual', '10:00–11:05 | Intervalo', '',
    'Mostrando 2 de 22 actividades.',
  ].join('\n'));
  assert(!normal.includes('event-Puntual') && !normal.includes('AGENT_ATE') &&
    !normal.includes('importance') && !normal.includes('eventIds'));

  const multi = presenter.present([
    make('Mañana', 2, 7, 15, 2, 7, 40),
    make('Sueño', 1, 23, 5, 2, 7, 0),
  ], 2, { day: 1, hour: 22, minute: 0 }, { day: 2, hour: 8, minute: 0 });
  assert.equal(multi, [
    'Mientras estabas fuera...', 'Día 1 · 22:00 → Día 2 · 08:00', '',
    'Día 2 · 07:15–07:40 | Mañana',
    'Día 1 · 23:05 → Día 2 · 07:00 | Sueño', '',
    'Mostrando 2 de 2 actividades.',
  ].join('\n'));
  assert.equal(presenter.present([make('Puntual', 2, 7, 15)], 1,
    { day: 1, hour: 22, minute: 0 }, { day: 2, hour: 8, minute: 0 }).split('\n')[3],
    'Día 2 · 07:15 | Puntual');

  assert.equal(presenter.present([], 0, last, query), [
    'Mientras estabas fuera...', 'Día 1 · 09:05–18:00', '',
    'No hay actividades para mostrar durante tu ausencia.',
  ].join('\n'));
  assert.equal(presenter.present([], 1, last, query), [
    'Mientras estabas fuera...', 'Día 1 · 09:05–18:00', '',
    'No se seleccionaron actividades para mostrar.',
    'Mostrando 0 de 1 actividad.',
  ].join('\n'));
  assert.equal(presenter.present([items[0]], 1, last, query).split('\n').at(-1),
    'Mostrando 1 de 1 actividad.');
  const tied = [make('Primera interacción', 1, 17, 5), make('Segunda interacción', 1, 17, 5)];
  assert.deepEqual(presenter.present(tied, 2, last, query).split('\n').slice(3, 5), [
    '17:05 | Primera interacción', '17:05 | Segunda interacción',
  ]);
  const snapshot = JSON.stringify(tied);
  for (const item of tied) { Object.freeze(item.eventIds); Object.freeze(item); }
  Object.freeze(tied);
  presenter.present(tied, 2, last, query);
  assert.equal(JSON.stringify(tied), snapshot);
  console.log('Presenter A-K: times, days, empty cases, counts, order, immutability and clean output passed.');

  const capture = (options?: { debug?: boolean; full?: boolean }) => {
    const output: string[] = [];
    const original = console.log;
    const originalTick = SimulationEngine.prototype.tick;
    let ticks = 0;
    let summary: ReturnType<typeof runActivitySummaryDemo>;
    try {
      console.log = (...args: unknown[]) => { output.push(args.join(' ')); };
      SimulationEngine.prototype.tick = function () {
        ticks++;
        return originalTick.call(this);
      };
      summary = runActivitySummaryDemo(options);
    } finally {
      console.log = original;
      SimulationEngine.prototype.tick = originalTick;
    }
    return { output, summary, ticks };
  };
  const plain = capture();
  const diagnostic = capture({ debug: true });
  const full = capture({ full: true });
  const fullDiagnostic = capture({ full: true, debug: true });
  const reversedFlags = capture({ debug: true, full: true });
  assert.equal(plain.output.length, 1);
  assert.equal(diagnostic.output.length, 2);
  assert.equal(full.output.length, 1);
  assert.equal(fullDiagnostic.output.length, 2);
  assert.equal(reversedFlags.output.length, 2);
  assert.equal(diagnostic.output[0], plain.output[0]);
  assert.equal(fullDiagnostic.output[0], full.output[0]);
  assert.equal(reversedFlags.output[0], full.output[0]);
  assert.match(reversedFlags.output[1], /Modo mostrado: completo/);
  assert.match(reversedFlags.output[1], /Presentación actual: 22 mostrados \| 0 omitidos/);
  assert.notEqual(full.output[0], plain.output[0]);
  assert(diagnostic.output[1].startsWith('\nDiagnóstico\n'));
  assert(fullDiagnostic.output[1].startsWith('\nDiagnóstico\n'));
  assert(!plain.output[0].includes('Diagnóstico') &&
    !plain.output[0].includes('Eventos filtrados') &&
    !plain.output[0].includes('MOVE:') &&
    !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(plain.output[0]));
  assert.equal(plain.summary.totalEvents, 26);
  assert.equal(diagnostic.summary.totalEvents, 26);
  assert.equal(full.summary.totalEvents, 26);
  assert.equal(fullDiagnostic.summary.totalEvents, 26);
  assert.deepEqual([plain.ticks, diagnostic.ticks, full.ticks, fullDiagnostic.ticks,
    reversedFlags.ticks], [120, 120, 120, 120, 120]);
  assert.equal(plain.output[0].split('\n').at(-1), 'Mostrando 8 de 22 actividades.');
  assert.equal(full.output[0].split('\n').at(-1), 'Mostrando 22 de 22 actividades.');
  assert.equal(full.output[0].split('\n').filter(line => line.includes(' | ')).length, 22);
  assert.match(diagnostic.output[1], /Resumen completo: 22 items/);
  assert.match(diagnostic.output[1], /Modo mostrado: breve/);
  assert.match(diagnostic.output[1], /Presentación actual: 8 mostrados \| 14 omitidos/);
  assert.match(diagnostic.output[1], /Selección breve: 8 seleccionados \| 14 no seleccionados/);
  assert.match(fullDiagnostic.output[1], /Modo mostrado: completo/);
  assert.match(fullDiagnostic.output[1], /Presentación actual: 22 mostrados \| 0 omitidos/);
  assert.match(fullDiagnostic.output[1], /Selección breve: 8 seleccionados \| 14 no seleccionados/);
  assert.equal((plain.output[0].match(/conversación/g) ?? []).length, 4);
  assert.equal((full.output[0].match(/conversación/g) ?? []).length, 4);
  assert.equal((full.output[0].match(/17:05 \|/g) ?? []).length, 2);
  assert.equal((full.output[0].match(/17:45 \|/g) ?? []).length, 2);
  const fullSnapshot = JSON.stringify(full.summary.events);
  const formatted = new ActivitySummaryFormatter().format(full.summary.events, 'agent-ana');
  assert.equal(formatted.length, 22);
  assert.equal(full.output[0], presenter.present(formatted, formatted.length,
    { day: 1, hour: 10, minute: 0 }, { day: 1, hour: 18, minute: 0 }));
  assert.equal(JSON.stringify(full.summary.events), fullSnapshot);
  assert.equal(new Set(formatted.flatMap(item => item.eventIds)).size,
    formatted.flatMap(item => item.eventIds).length);
  assert.deepEqual(plain.summary.events.map(e => [e.type, e.day, e.hour, e.minute,
    e.agentIds, e.locationId, e.importance]),
  diagnostic.summary.events.map(e => [e.type, e.day, e.hour, e.minute,
    e.agentIds, e.locationId, e.importance]));
  assert.deepEqual(full.summary.events.map(e => [e.type, e.day, e.hour, e.minute,
    e.agentIds, e.locationId, e.importance]),
  fullDiagnostic.summary.events.map(e => [e.type, e.day, e.hour, e.minute,
    e.agentIds, e.locationId, e.importance]));

  // Audit actual console output, independently of the presenter's rendering.
  // Only the block before Diagnóstico contains visible activity lines.
  for (const [run, isFull] of [
    [plain, false], [diagnostic, false], [full, true],
    [fullDiagnostic, true], [reversedFlags, true],
  ] as const) {
    const historyBefore = JSON.stringify(run.summary.events);
    const allItems = new ActivitySummaryFormatter().format(run.summary.events, run.summary.agentId);
    const expectedItems = isFull ? allItems : new ActivitySummarySelector().select(allItems);
    const blocks = run.output.join('\n').split('\n\nDiagnóstico\n');
    assert.equal(blocks.length, run.output.length);
    const lines = blocks[0].split('\n');
    assert.deepEqual(lines.slice(0, 3), ['Mientras estabas fuera...', 'Día 1 · 10:00–18:00', '']);
    assert.equal(lines.at(-2), '');
    const footer = /^Mostrando (\d+) de (\d+) actividades\.$/.exec(lines.at(-1)!);
    assert(footer, 'Presentation must end with its count, before any diagnostics');
    const activityLines = lines.slice(3, -2);
    assert.equal(activityLines.length, Number(footer[1]), 'Count actual lines, not just the footer');
    assert.equal(activityLines.length, expectedItems.length);
    assert.equal(Number(footer[2]), allItems.length);
    assert.equal(run.summary.totalEvents, 26);
    assert.equal(allItems.length, 22);
    assert.equal(expectedItems.length, isFull ? 22 : 8);
    for (let i = 0; i < expectedItems.length; i++) {
      const item = expectedItems[i];
      const line = /^(\d{2}:\d{2})(?:–(\d{2}:\d{2}))? \| (.+)$/.exec(activityLines[i]);
      assert(line, `Activity ${i + 1} must occupy exactly one valid line`);
      const start = [item.startHour, item.startMinute].map(n => String(n).padStart(2, '0')).join(':');
      const end = [item.endHour, item.endMinute].map(n => String(n).padStart(2, '0')).join(':');
      assert.equal(item.startDay, 1);
      assert.equal(item.endDay, 1);
      assert.deepEqual(line.slice(1), [start, start === end ? undefined : end, item.description],
        'Printed time, description and position must match the corresponding item');
    }
    const socialItems = expectedItems.filter(item => item.type === 'AGENTS_SOCIALIZED');
    assert.equal(socialItems.length, 4);
    assert.equal(new Set(socialItems.flatMap(item => item.eventIds)).size, 4);
    assert.equal(JSON.stringify(run.summary.events), historyBefore);
  }
  console.log('Presenter integration: every printed line matches its item and footer in all five modes passed.');
  console.log('Presenter demo: brief/full, debug, order, counts and one simulation per invocation passed.');
}
