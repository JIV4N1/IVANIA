import { Agent } from '../agents/Agent';
import { AgentEngine } from '../agents/AgentEngine';
import { World } from '../world/World';
import { SimulationClock } from '../simulation/SimulationClock';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { ActionExecutor } from '../simulation/ActionExecutor';
import { EventManager } from '../events/EventManager';
import { MemoryManager } from '../memory/MemoryManager';
import { RelationshipManager } from '../relationships/RelationshipManager';
import { ActivitySummary } from './ActivitySummary';
import { ActivitySummaryService } from './ActivitySummaryService';
import { ActivitySummaryPresenter } from './ActivitySummaryPresenter';

/** Separate in-memory demo; uses the unchanged simulation engines. */
export function runActivitySummaryDemo(options: { debug?: boolean; full?: boolean } = {}): ActivitySummary {
  const makeAgent = (id: string, name: string) => new Agent(id, name,
    { extroversion: 80, curiosity: 70, kindness: 70, impulsivity: 50,
      sociability: 70, patience: 60, confidence: 70 },
    { energy: 80, hunger: 20, socialNeed: 65, mood: 70, isSleeping: false }, [], 'cafe');
  const world = new World('Activity demo', [
    { id: 'home', name: 'Casa', type: 'home', capabilities: ['REST'] },
    { id: 'cafe', name: 'Cafetería', type: 'cafe', capabilities: ['EAT', 'SOCIALIZE'] },
    { id: 'work', name: 'Trabajo', type: 'work', capabilities: ['WORK'] },
  ], [makeAgent('agent-ana', 'Ana'), makeAgent('agent-sofia', 'Sofía')]);
  const clock = new SimulationClock(1, 8, 0);
  const events = new EventManager(world, clock);
  const engine = new SimulationEngine(world, clock, new AgentEngine(world),
    new ActionExecutor(world, new RelationshipManager(), new MemoryManager(), events, clock), events);

  // Advance to the hypothetical last connection: day 1, 10:00.
  for (let tick = 0; tick < 24; tick++) engine.tick();
  const lastConnection = { day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() };
  // Continue without changing agents or decisions because of that timestamp.
  for (let tick = 0; tick < 96; tick++) engine.tick();
  const consultation = { day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() };
  const service = new ActivitySummaryService(events);
  const summary = service.getSummaryForAgent('agent-ana',
    lastConnection.day, lastConnection.hour, lastConnection.minute);
  const items = service.getFormattedSummaryForAgent('agent-ana',
    lastConnection.day, lastConnection.hour, lastConnection.minute);
  const brief = service.getBriefSummaryForAgent('agent-ana',
    lastConnection.day, lastConnection.hour, lastConnection.minute);
  const displayed = options.full ? items : brief;
  const presentation = new ActivitySummaryPresenter().present(
    displayed, items.length, lastConnection, consultation);
  console.log(presentation);

  if (options.debug) {
    const movesBefore = summary.events.filter(event => event.type === 'AGENT_MOVED').length;
    const movesAfter = items.filter(item => item.type === 'AGENT_MOVED').length;
    const omittedMoves = movesBefore - movesAfter;
    const highSocial = (item: typeof items[number]) =>
      item.type === 'AGENTS_SOCIALIZED' && item.importance >= 40;
    const coincidentSocial = summary.events.filter(event =>
      event.type === 'AGENTS_SOCIALIZED' && event.day === 1 && event.hour === 17 &&
      (event.minute === 5 || event.minute === 45));
    const time = (hour: number, minute: number) =>
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const diagnostics = [
      'Diagnóstico',
      `Consulta: ${clock.getFormattedTime()} | Ana: desde Día ${lastConnection.day} - ${time(lastConnection.hour, lastConnection.minute)}`,
      `Eventos filtrados: ${summary.totalEvents} | importantes: ${summary.importantEvents}`,
      `Comparación: ${summary.totalEvents} eventos | ${items.length + omittedMoves} items antes → ${items.length} después`,
      `MOVE: ${movesBefore} antes | ${movesAfter} conservados | ${omittedMoves} omitidos`,
      'Se conserva la última llegada al lugar de la siguiente actividad del mismo agente.',
      'Se omiten trayectos intermedios o sin actividad posterior en ese destino.',
      `Resumen completo: ${items.length} items`,
      `Modo mostrado: ${options.full ? 'completo' : 'breve'}`,
      `Presentación actual: ${displayed.length} mostrados | ${items.length - displayed.length} omitidos`,
      `Selección breve: ${brief.length} seleccionados | ${items.length - brief.length} no seleccionados (máximo 8)`,
      'Los items no seleccionados para el resumen breve siguen disponibles en el resumen completo.',
      `Interacciones sociales importantes en el resumen breve: ${brief.filter(highSocial).length} de ${items.filter(highSocial).length} seleccionadas`,
      'Eventos sociales coincidentes (agentIds: iniciador, destinatario):',
      ...coincidentSocial.map(event =>
        `${event.id} | Día ${event.day} ${time(event.hour, event.minute)} | [${event.agentIds.join(', ')}] | ${event.locationId} | ${event.description}`),
    ];
    if (brief.length > 0) {
      const first = brief[0];
      const last = brief[brief.length - 1];
      diagnostics.push(
        `Cobertura temporal del resumen breve: Día ${first.startDay} ${time(first.startHour, first.startMinute)} a Día ${last.startDay} ${time(last.startHour, last.startMinute)}.`,
        'Los espacios restantes se distribuyen por distancia temporal dentro de cada grupo de prioridad.');
    }
    console.log(`\n${diagnostics.join('\n')}`);
  }
  return summary;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  runActivitySummaryDemo({ debug: args.includes('--debug'), full: args.includes('--full') });
}
