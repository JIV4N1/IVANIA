import { createActivityDemoSimulation } from './createActivityDemoSimulation';
import { ActivitySummary } from './ActivitySummary';
import { ActivitySummaryService } from './ActivitySummaryService';
import { activityCategories, activityCategory, ActivitySummarySelection } from './ActivitySummarySelector';
import { ActivitySummaryMoment, ActivitySummaryPresenter } from './ActivitySummaryPresenter';

const scenarios = {
  diurno: { from: { day: 1, hour: 10, minute: 0 }, to: { day: 1, hour: 18, minute: 0 } },
  nocturno: { from: { day: 1, hour: 22, minute: 0 }, to: { day: 2, hour: 8, minute: 0 } },
  'varios-dias': { from: { day: 1, hour: 10, minute: 0 }, to: { day: 3, hour: 18, minute: 0 } },
};

/** Separate in-memory demo; uses the unchanged simulation engines. */
export function runActivitySummaryDemo(options: {
  debug?: boolean; full?: boolean; scenario?: string; selection?: ActivitySummarySelection;
} = {}): ActivitySummary {
  const selection = options.selection ?? 'important';
  if (selection !== 'important' && selection !== 'balanced') {
    throw new RangeError(`Selección desconocida: "${selection}". Usa important o balanced.`);
  }
  const scenarioName = options.scenario ?? 'diurno';
  if (!Object.hasOwn(scenarios, scenarioName)) {
    throw new RangeError(`Escenario desconocido: "${scenarioName}". Usa diurno, nocturno o varios-dias.`);
  }
  const scenario = scenarios[scenarioName as keyof typeof scenarios];
  const { clock, events, engine } = createActivityDemoSimulation();

  const now = (): ActivitySummaryMoment =>
    ({ day: clock.getDay(), hour: clock.getHour(), minute: clock.getMinute() });
  const minutes = (moment: ActivitySummaryMoment) => moment.day * 1440 + moment.hour * 60 + moment.minute;
  let ticks = 0;
  const advanceTo = (moment: ActivitySummaryMoment) => {
    while (minutes(now()) < minutes(moment)) {
      engine.tick();
      ticks++;
    }
  };
  advanceTo(scenario.from);
  const lastConnection = now();
  // Only normal ticks advance the world during the absence.
  advanceTo(scenario.to);
  const consultation = now();
  const service = new ActivitySummaryService(events);
  const summary = service.getSummaryForAgent('agent-ana',
    lastConnection.day, lastConnection.hour, lastConnection.minute);
  const items = service.getFormattedSummaryForAgent('agent-ana',
    lastConnection.day, lastConnection.hour, lastConnection.minute);
  const displayed = options.full ? items : service.getBriefSummaryForAgent('agent-ana',
    lastConnection.day, lastConnection.hour, lastConnection.minute, 8, selection);
  const presentation = new ActivitySummaryPresenter().present(
    displayed, items.length, lastConnection, consultation);
  console.log(presentation);

  if (options.debug) {
    const movesBefore = summary.events.filter(event => event.type === 'AGENT_MOVED').length;
    const movesAfter = items.filter(item => item.type === 'AGENT_MOVED').length;
    const omittedMoves = movesBefore - movesAfter;
    const highSocial = (item: typeof items[number]) =>
      item.type === 'AGENTS_SOCIALIZED' && item.importance >= 40;
    const socialEvents = summary.events.filter(event => event.type === 'AGENTS_SOCIALIZED');
    const coincidenceKey = (event: typeof socialEvents[number]) => JSON.stringify([
      event.day, event.hour, event.minute, event.locationId, [...event.agentIds].sort(),
    ]);
    const counts = new Map<string, number>();
    for (const event of socialEvents) {
      const key = coincidenceKey(event);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const coincidentSocial = socialEvents.filter(event => counts.get(coincidenceKey(event))! > 1);
    const time = (hour: number, minute: number) =>
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const diagnostics = [
      'Diagnóstico',
      `Escenario: ${scenarioName}`,
      options.full ? `Política: ${selection} (no se aplica al modo completo)` : `Política aplicada: ${selection}`,
      ...activityCategories.map(category =>
        `${category}: ${items.filter(item => activityCategory(item) === category).length} disponibles | ${displayed.filter(item => activityCategory(item) === category).length} seleccionados`),
      `Última conexión: Día ${lastConnection.day} - ${time(lastConnection.hour, lastConnection.minute)}`,
      `Consulta: ${clock.getFormattedTime()} | Ana`,
      `Ticks ejecutados: ${ticks}`,
      `Eventos filtrados: ${summary.totalEvents} | importantes: ${summary.importantEvents}`,
      `Comparación: ${summary.totalEvents} eventos | ${items.length + omittedMoves} items antes → ${items.length} después`,
      `MOVE: ${movesBefore} antes | ${movesAfter} conservados | ${omittedMoves} omitidos`,
      'Se conserva la última llegada al lugar de la siguiente actividad del mismo agente.',
      'Se omiten trayectos intermedios o sin actividad posterior en ese destino.',
      `Resumen completo: ${items.length} items`,
      `Modo mostrado: ${options.full ? 'completo' : 'breve'}`,
      `Presentación actual: ${displayed.length} mostrados | ${items.length - displayed.length} omitidos`,
      ...(options.full ? [] : [`Selección breve: ${displayed.length} seleccionados | ${items.length - displayed.length} no seleccionados (máximo 8)`]),
      'Los items no seleccionados para el resumen breve siguen disponibles en el resumen completo.',
      `Interacciones sociales importantes mostradas: ${displayed.filter(highSocial).length} de ${items.filter(highSocial).length} seleccionadas`,
      'Eventos sociales coincidentes (agentIds: iniciador, destinatario):',
      ...coincidentSocial.map(event =>
        `${event.id} | Día ${event.day} ${time(event.hour, event.minute)} | [${event.agentIds.join(', ')}] | ${event.locationId} | ${event.description}`),
    ];
    if (displayed.length > 0) {
      const first = displayed[0];
      const last = displayed[displayed.length - 1];
      diagnostics.push(
        `Cobertura temporal del resumen ${options.full ? 'completo' : 'breve'} (inicios de actividad): Día ${first.startDay} ${time(first.startHour, first.startMinute)} a Día ${last.startDay} ${time(last.startHour, last.startMinute)}.`,
        ...(options.full ? [] : ['Los espacios restantes se distribuyen por distancia temporal dentro de cada grupo de prioridad.']));
    }
    console.log(`\n${diagnostics.join('\n')}`);
  }
  return summary;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  try {
    let scenario: string | undefined;
    let selection: ActivitySummarySelection | undefined;
    for (let i = 0; i < args.length; i++) {
      const flag = args[i];
      if (flag !== '--scenario' && flag !== '--selection') continue;
      if (!args[i + 1] || args[i + 1].startsWith('--')) {
        throw new Error(`Falta el valor de ${flag}. Usa ${flag === '--scenario' ? 'diurno, nocturno o varios-dias' : 'important o balanced'}.`);
      }
      const value = args[++i];
      if (flag === '--scenario') scenario = value;
      else {
        if (value !== 'important' && value !== 'balanced') {
          throw new RangeError(`Selección desconocida: "${value}". Usa important o balanced.`);
        }
        selection = value;
      }
    }
    runActivitySummaryDemo({ scenario, selection, debug: args.includes('--debug'), full: args.includes('--full') });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
