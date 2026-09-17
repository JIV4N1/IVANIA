import { isDeepStrictEqual } from 'node:util';
import { ActivitySummaryFromConnectionService } from './ActivitySummaryFromConnectionService';
import { ActivitySummaryMoment, ActivitySummaryPresenter } from './ActivitySummaryPresenter';
import { ActivitySummaryService } from './ActivitySummaryService';
import { createActivityDemoSimulation } from './createActivityDemoSimulation';
import { LastConnectionRegistry } from './LastConnectionRegistry';

export function runActivitySessionDemo(): void {
  const { clock, events, engine } = createActivityDemoSimulation();
  const connections = new LastConnectionRegistry();
  const summaries = new ActivitySummaryFromConnectionService(connections, new ActivitySummaryService(events));
  const presenter = new ActivitySummaryPresenter();
  const now = (): ActivitySummaryMoment =>
    ({ day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() });
  const time = (moment: ActivitySummaryMoment) =>
    `Día ${moment.day} · ${String(moment.hour).padStart(2, '0')}:${String(moment.minute).padStart(2, '0')}`;

  for (let i = 0; i < 24; i++) engine.tick(); // 08:00 -> departure at 10:00.
  const departure = now();
  connections.register('agent-ana', departure);
  console.log(`Salida de Ana. Última conexión registrada: ${time(connections.get('agent-ana')!)}.`);
  for (let i = 0; i < 96; i++) engine.tick(); // Normal absence until 18:00.

  const returnedAt = now(); // Capture before querying or presenting; confirmation uses this exact moment.
  console.log(`Corte capturado al regresar: ${time(returnedAt)}.`);
  for (let i = 0; i < 24; i++) engine.tick();
  console.log(`24 ticks antes de consultar, sin confirmar. Momento actual: ${time(now())}.`);
  const result = summaries.getSummaryAt('agent-ana', returnedAt, 8, 'balanced')!;
  console.log(`Consulta 1: corte ${time(result.to)} | ${result.totalEvents} eventos | ${result.totalItems} items completos | ${result.selectedCount} mostrados | ${result.omittedCount} omitidos.`);
  console.log(presenter.present(result.selectedItems, result.totalItems, result.from, result.to));

  const repeatedAt = now();
  const repeated = summaries.getSummaryAt('agent-ana', returnedAt, 8, 'balanced')!;
  const unchanged = isDeepStrictEqual(result, repeated) &&
    isDeepStrictEqual(connections.get('agent-ana'), departure);
  if (!unchanged) throw new Error('Repeated query changed activity or last connection');
  console.log(`Consulta 2: ${time(repeatedAt)} | mismo corte ${time(repeated.to)} | ${repeated.totalItems} items completos. Mismo resultado; consultar no consumió actividad ni actualizó el registro.`);

  connections.register('agent-ana', result.to);
  console.log(`Regreso confirmado explícitamente: ${time(result.to)}.`);
  const nextConsultation = now();
  const after = summaries.getSummaryAt('agent-ana', nextConsultation)!;
  console.log(`Consulta 3: ${time(after.to)} | ${after.totalItems} items completos | ${after.totalEvents} eventos | ${after.selectedCount} mostrados | ${after.omittedCount} omitidos.`);
  console.log(presenter.present(after.selectedItems, after.totalItems, after.from, after.to));
}

if (require.main === module) runActivitySessionDemo();
