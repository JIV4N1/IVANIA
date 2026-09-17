import assert from 'node:assert/strict';
import { ActivitySummaryFromConnectionService } from './ActivitySummaryFromConnectionService';
import { ActivitySummaryMoment, ActivitySummaryPresenter } from './ActivitySummaryPresenter';
import { ActivitySummaryService } from './ActivitySummaryService';
import { createActivityDemoSimulation } from './createActivityDemoSimulation';
import { LastConnectionRegistry } from './LastConnectionRegistry';

/** Two consumers of one simulation; only explicit register calls confirm returns. */
export function runActivityTwoAgentsDemo(): void {
  const { clock, events, engine } = createActivityDemoSimulation();
  const connections = new LastConnectionRegistry();
  const summaries = new ActivitySummaryFromConnectionService(connections, new ActivitySummaryService(events));
  const presenter = new ActivitySummaryPresenter();
  const now = (): ActivitySummaryMoment =>
    ({ day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() });
  const time = (m: ActivitySummaryMoment) =>
    `Día ${m.day} · ${String(m.hour).padStart(2, '0')}:${String(m.minute).padStart(2, '0')}`;
  const advance = (ticks: number) => { for (let i = 0; i < ticks; i++) engine.tick(); };
  const query = (id: string, name: string, cutoff: ActivitySummaryMoment, present = false) => {
    const result = summaries.getSummaryAt(id, cutoff, 8, 'balanced')!;
    console.log(`${name}: corte ${time(result.to)} | actual ${time(now())} | ${result.totalEvents} eventos | ${result.totalItems} items | ${result.selectedCount} mostrados | ${result.omittedCount} omitidos.`);
    if (present) console.log(presenter.present(result.selectedItems, result.totalItems, result.from, result.to));
    return result;
  };

  advance(24);
  connections.register('agent-ana', now());
  console.log(`Salida de Ana registrada: ${time(connections.get('agent-ana')!)}.`);
  advance(24);
  connections.register('agent-sofia', now());
  console.log(`Salida de Sofía registrada: ${time(connections.get('agent-sofia')!)}.`);
  advance(72);
  const anaCutoff = now();
  const ana = query('agent-ana', 'Ana — consulta inicial', anaCutoff, true);
  advance(24);
  const sofiaCutoff = now();
  const sofia = query('agent-sofia', 'Sofía — consulta inicial', sofiaCutoff, true);

  // Inspect identity in complete results, without making any new summary selection.
  const shared = events.getEvents().find(event => event.type === 'AGENTS_SOCIALIZED' &&
    event.agentIds.includes('agent-ana') && event.agentIds.includes('agent-sofia') &&
    ana.completeItems.some(item => item.eventIds.includes(event.id)) &&
    sofia.completeItems.some(item => item.eventIds.includes(event.id)));
  assert(shared, 'No shared social event found in the real history and both initial intervals');
  console.log(`Interacción compartida: ${shared.id} | ${time(shared)}.`);
  console.log(`Ana: ${ana.completeItems.find(item => item.eventIds.includes(shared.id))!.description}`);
  console.log(`Sofía: ${sofia.completeItems.find(item => item.eventIds.includes(shared.id))!.description}`);
  const reciprocal = events.getEvents().find(event => event.type === 'AGENTS_SOCIALIZED' &&
    event.day === shared.day && event.hour === shared.hour && event.minute === shared.minute &&
    event.agentIds[0] === shared.agentIds[1] && event.agentIds[1] === shared.agentIds[0]);
  assert(reciprocal && reciprocal.id !== shared.id, 'Expected a distinct reciprocal event in real history');
  console.log(`Acción recíproca separada: ${reciprocal.id}.`);

  const sofiaConnection = connections.get('agent-sofia');
  connections.register('agent-ana', ana.to);
  console.log(`Ana confirma explícitamente: ${time(ana.to)}.`);
  const sofiaRepeated = query('agent-sofia', 'Sofía — consulta repetida', sofiaCutoff);
  assert.deepEqual(connections.get('agent-sofia'), sofiaConnection);
  assert.deepEqual(sofiaRepeated, sofia);
  console.log('Sofía conserva su registro de las 12:00 y el mismo resultado; la consulta no consumió eventos.');
  const anaAfter = query('agent-ana', 'Ana — actividad posterior', sofiaCutoff, true);
  const anaConnection = connections.get('agent-ana');
  connections.register('agent-sofia', sofia.to);
  console.log(`Sofía confirma explícitamente: ${time(sofia.to)}.`);
  const anaRepeated = query('agent-ana', 'Ana — consulta repetida', sofiaCutoff);
  assert.deepEqual(connections.get('agent-ana'), anaConnection);
  assert.deepEqual(anaRepeated, anaAfter);
  console.log('Ana conserva su registro de las 18:00 y el mismo resultado posterior.');
}

if (require.main === module) runActivityTwoAgentsDemo();
