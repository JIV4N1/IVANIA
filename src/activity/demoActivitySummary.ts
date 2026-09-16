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

/** Separate in-memory demo; uses the unchanged simulation engines. */
export function runActivitySummaryDemo(): ActivitySummary {
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
  const fromDay = clock.getDay();
  const fromHour = clock.getHour();
  const fromMinute = clock.getMinute();
  // Continue without changing agents or decisions because of that timestamp.
  for (let tick = 0; tick < 96; tick++) engine.tick();
  const service = new ActivitySummaryService(events);
  const summary = service.getSummaryForAgent('agent-ana', fromDay, fromHour, fromMinute);
  console.log(`Consulta: ${clock.getFormattedTime()} | Ana: desde Día ${fromDay} - 10:00`);
  console.log('Mientras estabas fuera...');
  console.log(`${summary.totalEvents} eventos relacionados contigo`);
  console.log(`${summary.importantEvents} importantes`);
  const items = service.getFormattedSummaryForAgent('agent-ana', fromDay, fromHour, fromMinute);
  const brief = service.getBriefSummaryForAgent('agent-ana', fromDay, fromHour, fromMinute);
  const movesBefore = summary.events.filter(event => event.type === 'AGENT_MOVED').length;
  const movesAfter = items.filter(item => item.type === 'AGENT_MOVED').length;
  const omitted = movesBefore - movesAfter;
  // Group boundaries are unchanged: restoring each hidden MOVE reconstructs
  // the previous formatter's item count without duplicating its implementation.
  console.log(`Comparación: ${summary.totalEvents} eventos | ${items.length + omitted} items antes → ${items.length} después`);
  console.log(`MOVE: ${movesBefore} antes | ${movesAfter} conservados | ${omitted} omitidos`);
  console.log('Se conserva la última llegada al lugar de la siguiente actividad del mismo agente.');
  console.log('Se omiten trayectos intermedios o sin actividad posterior en ese destino.');
  console.log(`Resumen completo: ${items.length} items`);
  console.log(`Resumen breve: ${brief.length} seleccionados | ${items.length - brief.length} omitidos (máximo 8)`);
  console.log('Los items omitidos siguen disponibles en el resumen completo.');
  const time = (hour: number, minute: number) =>
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const highSocial = (item: typeof items[number]) =>
    item.type === 'AGENTS_SOCIALIZED' && item.importance >= 40;
  console.log(`Interacciones sociales importantes: ${brief.filter(highSocial).length} de ${items.filter(highSocial).length} seleccionadas`);
  if (brief.length > 0) {
    const first = brief[0];
    const last = brief[brief.length - 1];
    console.log(`Cobertura temporal: Día ${first.startDay} ${time(first.startHour, first.startMinute)} a Día ${last.startDay} ${time(last.startHour, last.startMinute)}.`);
    console.log('Los espacios restantes se distribuyen por distancia temporal dentro de cada grupo de prioridad.');
  }
  for (const item of brief) {
    const start = time(item.startHour, item.startMinute);
    const end = time(item.endHour, item.endMinute);
    const interval = item.startDay !== item.endDay
      ? `Día ${item.startDay} ${start}–Día ${item.endDay} ${end}`
      : start === end ? start : `${start}–${end}`;
    console.log(`${interval} | ${item.description}`);
  }
  return summary;
}

if (require.main === module) runActivitySummaryDemo();
