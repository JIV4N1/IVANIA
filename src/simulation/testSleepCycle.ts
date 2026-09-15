import assert from 'node:assert/strict';
import { Agent } from '../agents/Agent';
import { Personality } from '../agents/Personality';
import { World } from '../world/World';
import { Location } from '../world/Location';
import { SimulationClock } from './SimulationClock';
import { SimulationEngine } from './SimulationEngine';
import { AgentEngine } from '../agents/AgentEngine';
import { ActionExecutor } from './ActionExecutor';
import { RelationshipManager } from '../relationships/RelationshipManager';
import { MemoryManager } from '../memory/MemoryManager';
import { EventManager } from '../events/EventManager';

export function runIsolatedSleepTests(): void {
  console.log('━'.repeat(65));
  console.log('=== PRUEBAS AISLADAS: CICLO DE SUEÑO DETERMINISTA ===');
  console.log('━'.repeat(65) + '\n');

  const locations: Location[] = [
    { id: 'loc-casa',   name: 'Casa',      type: 'home',       capabilities: ['REST'] },
    { id: 'loc-parque', name: 'Parque',    type: 'park',       capabilities: ['SOCIALIZE'] },
    { id: 'loc-cafe',   name: 'Cafetería', type: 'restaurant', capabilities: ['EAT', 'SOCIALIZE'] },
  ];

  const defaultPersonality: Personality = {
    extroversion: 70, kindness: 70, curiosity: 70,
    impulsivity: 50, sociability: 70, patience: 60, confidence: 70,
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Caso A — Entrada en sueño a las 23:00 estando en Casa (REST)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Caso A — 22:55 -> 23:00 en Casa]');
  const worldA = new World('World A', locations);
  const clockA = new SimulationClock(1, 22, 55); // 22:55
  const anaA = new Agent('agent-ana-a', 'Ana', defaultPersonality,
    { energy: 50, hunger: 20, socialNeed: 30, mood: 70, isSleeping: false }, [], 'loc-casa');
  worldA.addAgent(anaA);

  const eventManagerA = new EventManager(worldA, clockA);
  const engineA = new SimulationEngine(
    worldA, clockA, new AgentEngine(worldA),
    new ActionExecutor(worldA, new RelationshipManager(), new MemoryManager(), eventManagerA, clockA),
    eventManagerA
  );

  engineA.tick(); // Pasa a 23:00

  console.log(`  Tiempo actual: ${clockA.getFormattedTime()}`);
  assert(anaA.state.isSleeping, "Ana está durmiendo (isSleeping)");
  console.log(`  ¿Ana está durmiendo (isSleeping)?: ${anaA.state.isSleeping ? 'SÍ (✓)' : 'NO (✗)'}`);
  const sleepEventA = worldA.events.find((e) => e.type === 'AGENT_WENT_TO_SLEEP');
  assert(sleepEventA, "Evento AGENT_WENT_TO_SLEEP registrado");
  console.log(`  ¿Evento AGENT_WENT_TO_SLEEP registrado?: ${sleepEventA ? `SÍ (✓) -> "${sleepEventA.description}"` : 'NO (✗)'}\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // Caso B — Agente en Parque a las 23:00 -> Mueve a Casa y luego duerme
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Caso B — 23:00 en Parque (No REST) -> MOVE a Casa -> Dormir]');
  const worldB = new World('World B', locations);
  const clockB = new SimulationClock(1, 22, 55); // 22:55
  const carlosB = new Agent('agent-carlos-b', 'Carlos', defaultPersonality,
    { energy: 50, hunger: 20, socialNeed: 30, mood: 70, isSleeping: false }, [], 'loc-parque');
  worldB.addAgent(carlosB);

  const eventManagerB = new EventManager(worldB, clockB);
  const engineB = new SimulationEngine(
    worldB, clockB, new AgentEngine(worldB),
    new ActionExecutor(worldB, new RelationshipManager(), new MemoryManager(), eventManagerB, clockB),
    eventManagerB
  );

  // Tick 1: 22:55 -> 23:00 (Carlos en parque decide MOVE a Casa)
  engineB.tick();
  console.log(`  Tick 1 (${clockB.getFormattedTime()}): Ubicación = ${carlosB.locationId}, isSleeping = ${carlosB.state.isSleeping}`);
  const moveEventB = worldB.events.find((e) => e.type === 'AGENT_MOVED');
  assert(carlosB.locationId === 'loc-casa' && moveEventB, "Se movió hacia Casa");
  console.log(`  ¿Se movió hacia Casa?: ${carlosB.locationId === 'loc-casa' && moveEventB ? 'SÍ (✓)' : 'NO (✗)'}`);

  // Tick 2: 23:00 -> 23:05 (Ya en Casa -> entra en sueño)
  engineB.tick();
  console.log(`  Tick 2 (${clockB.getFormattedTime()}): isSleeping = ${carlosB.state.isSleeping}`);
  const sleepEventB = worldB.events.find((e) => e.type === 'AGENT_WENT_TO_SLEEP');
  assert(sleepEventB && carlosB.state.isSleeping, "Entró en sueño al llegar");
  console.log(`  ¿Entró en sueño al llegar?: ${sleepEventB && carlosB.state.isSleeping ? 'SÍ (✓)' : 'NO (✗)'}\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // Caso C — Agente dormido durante varios ticks (progresión de necesidades)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Caso C — Progresión durante el sueño (12 ticks = 1 hora)]');
  const worldC = new World('World C', locations);
  const clockC = new SimulationClock(1, 23, 0); // 23:00
  const sofiaC = new Agent('agent-sofia-c', 'Sofía', defaultPersonality,
    { energy: 30, hunger: 20, socialNeed: 20, mood: 70, isSleeping: true }, [], 'loc-casa');
  worldC.addAgent(sofiaC);

  const eventManagerC = new EventManager(worldC, clockC);
  const engineC = new SimulationEngine(
    worldC, clockC, new AgentEngine(worldC),
    new ActionExecutor(worldC, new RelationshipManager(), new MemoryManager(), eventManagerC, clockC),
    eventManagerC
  );

  const initialEnergy = sofiaC.state.energy;
  const initialHunger = sofiaC.state.hunger;
  const initialSocial = sofiaC.state.socialNeed;

  // Ejecutamos 12 ticks (60 minutos durmiendo)
  for (let i = 0; i < 12; i++) {
    engineC.tick();
  }

  console.log(`  Tiempo final: ${clockC.getFormattedTime()}`);
  console.log(`  Energía     : ${initialEnergy} -> ${sofiaC.state.energy} (+${sofiaC.state.energy - initialEnergy}, esperado +18)`);
  console.log(`  Hambre      : ${initialHunger} -> ${sofiaC.state.hunger} (+${sofiaC.state.hunger - initialHunger}, esperado +2.4)`);
  console.log(`  SocialNeed  : ${initialSocial} -> ${sofiaC.state.socialNeed} (+${sofiaC.state.socialNeed - initialSocial}, esperado +1.8)`);
  assert(Math.abs(sofiaC.state.energy - initialEnergy - 18) < 0.001, 'Sleep energy +18/h');
  assert(Math.abs(sofiaC.state.hunger - initialHunger - 2.4) < 0.001, 'Sleep hunger +2.4/h');
  assert(Math.abs(sofiaC.state.socialNeed - initialSocial - 1.8) < 0.001, 'Sleep social need +1.8/h');
  assert.equal(clockC.getDay(), 2, 'Clock advances to next day');
  assert.equal(clockC.getHour(), 0);
  assert.equal(clockC.getMinute(), 0);
  const anySocialEventC = worldC.events.some((e) => e.type === 'AGENTS_SOCIALIZED');
  assert(!anySocialEventC, "Cero socializaciones durante el sueño");
  console.log(`  ¿Cero socializaciones durante el sueño?: ${!anySocialEventC ? 'SÍ (✓)' : 'NO (✗)'}\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // Caso D — Despertar a las 07:00
  // ───────────────────────────────────────────────────────────────────────────
  console.log('[Caso D — 06:55 -> 07:00 (Despertar)]');
  const worldD = new World('World D', locations);
  const clockD = new SimulationClock(1, 6, 55); // 06:55
  const diegoD = new Agent('agent-diego-d', 'Diego', defaultPersonality,
    { energy: 90, hunger: 35, socialNeed: 30, mood: 70, isSleeping: true }, [], 'loc-casa');
  worldD.addAgent(diegoD);

  const eventManagerD = new EventManager(worldD, clockD);
  const engineD = new SimulationEngine(
    worldD, clockD, new AgentEngine(worldD),
    new ActionExecutor(worldD, new RelationshipManager(), new MemoryManager(), eventManagerD, clockD),
    eventManagerD
  );

  engineD.tick(); // Pasa a 07:00

  console.log(`  Tiempo actual: ${clockD.getFormattedTime()}`);
  assert(!diegoD.state.isSleeping, "Diego despertó (isSleeping === false)");
  console.log(`  ¿Diego despertó (isSleeping === false)?: ${!diegoD.state.isSleeping ? 'SÍ (✓)' : 'NO (✗)'}`);
  const wakeEventD = worldD.events.find((e) => e.type === 'AGENT_WOKE_UP');
  assert(wakeEventD, "Evento AGENT_WOKE_UP registrado");
  console.log(`  ¿Evento AGENT_WOKE_UP registrado?: ${wakeEventD ? `SÍ (✓) -> "${wakeEventD.description}"` : 'NO (✗)'}\n`);
}
