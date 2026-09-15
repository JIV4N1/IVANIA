"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIsolatedSleepTests = runIsolatedSleepTests;
const strict_1 = __importDefault(require("node:assert/strict"));
const Agent_1 = require("../agents/Agent");
const World_1 = require("../world/World");
const SimulationClock_1 = require("./SimulationClock");
const SimulationEngine_1 = require("./SimulationEngine");
const AgentEngine_1 = require("../agents/AgentEngine");
const ActionExecutor_1 = require("./ActionExecutor");
const RelationshipManager_1 = require("../relationships/RelationshipManager");
const MemoryManager_1 = require("../memory/MemoryManager");
const EventManager_1 = require("../events/EventManager");
function runIsolatedSleepTests() {
    console.log('━'.repeat(65));
    console.log('=== PRUEBAS AISLADAS: CICLO DE SUEÑO DETERMINISTA ===');
    console.log('━'.repeat(65) + '\n');
    const locations = [
        { id: 'loc-casa', name: 'Casa', type: 'home', capabilities: ['REST'] },
        { id: 'loc-parque', name: 'Parque', type: 'park', capabilities: ['SOCIALIZE'] },
        { id: 'loc-cafe', name: 'Cafetería', type: 'restaurant', capabilities: ['EAT', 'SOCIALIZE'] },
    ];
    const defaultPersonality = {
        extroversion: 70, kindness: 70, curiosity: 70,
        impulsivity: 50, sociability: 70, patience: 60, confidence: 70,
    };
    // ───────────────────────────────────────────────────────────────────────────
    // Caso A — Entrada en sueño a las 23:00 estando en Casa (REST)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Caso A — 22:55 -> 23:00 en Casa]');
    const worldA = new World_1.World('World A', locations);
    const clockA = new SimulationClock_1.SimulationClock(1, 22, 55); // 22:55
    const anaA = new Agent_1.Agent('agent-ana-a', 'Ana', defaultPersonality, { energy: 50, hunger: 20, socialNeed: 30, mood: 70, isSleeping: false }, [], 'loc-casa');
    worldA.addAgent(anaA);
    const eventManagerA = new EventManager_1.EventManager(worldA, clockA);
    const engineA = new SimulationEngine_1.SimulationEngine(worldA, clockA, new AgentEngine_1.AgentEngine(worldA), new ActionExecutor_1.ActionExecutor(worldA, new RelationshipManager_1.RelationshipManager(), new MemoryManager_1.MemoryManager(), eventManagerA, clockA), eventManagerA);
    engineA.tick(); // Pasa a 23:00
    console.log(`  Tiempo actual: ${clockA.getFormattedTime()}`);
    (0, strict_1.default)(anaA.state.isSleeping, "Ana está durmiendo (isSleeping)");
    console.log(`  ¿Ana está durmiendo (isSleeping)?: ${anaA.state.isSleeping ? 'SÍ (✓)' : 'NO (✗)'}`);
    const sleepEventA = worldA.events.find((e) => e.type === 'AGENT_WENT_TO_SLEEP');
    (0, strict_1.default)(sleepEventA, "Evento AGENT_WENT_TO_SLEEP registrado");
    console.log(`  ¿Evento AGENT_WENT_TO_SLEEP registrado?: ${sleepEventA ? `SÍ (✓) -> "${sleepEventA.description}"` : 'NO (✗)'}\n`);
    // ───────────────────────────────────────────────────────────────────────────
    // Caso B — Agente en Parque a las 23:00 -> Mueve a Casa y luego duerme
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Caso B — 23:00 en Parque (No REST) -> MOVE a Casa -> Dormir]');
    const worldB = new World_1.World('World B', locations);
    const clockB = new SimulationClock_1.SimulationClock(1, 22, 55); // 22:55
    const carlosB = new Agent_1.Agent('agent-carlos-b', 'Carlos', defaultPersonality, { energy: 50, hunger: 20, socialNeed: 30, mood: 70, isSleeping: false }, [], 'loc-parque');
    worldB.addAgent(carlosB);
    const eventManagerB = new EventManager_1.EventManager(worldB, clockB);
    const engineB = new SimulationEngine_1.SimulationEngine(worldB, clockB, new AgentEngine_1.AgentEngine(worldB), new ActionExecutor_1.ActionExecutor(worldB, new RelationshipManager_1.RelationshipManager(), new MemoryManager_1.MemoryManager(), eventManagerB, clockB), eventManagerB);
    // Tick 1: 22:55 -> 23:00 (Carlos en parque decide MOVE a Casa)
    engineB.tick();
    console.log(`  Tick 1 (${clockB.getFormattedTime()}): Ubicación = ${carlosB.locationId}, isSleeping = ${carlosB.state.isSleeping}`);
    const moveEventB = worldB.events.find((e) => e.type === 'AGENT_MOVED');
    (0, strict_1.default)(carlosB.locationId === 'loc-casa' && moveEventB, "Se movió hacia Casa");
    console.log(`  ¿Se movió hacia Casa?: ${carlosB.locationId === 'loc-casa' && moveEventB ? 'SÍ (✓)' : 'NO (✗)'}`);
    // Tick 2: 23:00 -> 23:05 (Ya en Casa -> entra en sueño)
    engineB.tick();
    console.log(`  Tick 2 (${clockB.getFormattedTime()}): isSleeping = ${carlosB.state.isSleeping}`);
    const sleepEventB = worldB.events.find((e) => e.type === 'AGENT_WENT_TO_SLEEP');
    (0, strict_1.default)(sleepEventB && carlosB.state.isSleeping, "Entró en sueño al llegar");
    console.log(`  ¿Entró en sueño al llegar?: ${sleepEventB && carlosB.state.isSleeping ? 'SÍ (✓)' : 'NO (✗)'}\n`);
    // ───────────────────────────────────────────────────────────────────────────
    // Caso C — Agente dormido durante varios ticks (progresión de necesidades)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Caso C — Progresión durante el sueño (12 ticks = 1 hora)]');
    const worldC = new World_1.World('World C', locations);
    const clockC = new SimulationClock_1.SimulationClock(1, 23, 0); // 23:00
    const sofiaC = new Agent_1.Agent('agent-sofia-c', 'Sofía', defaultPersonality, { energy: 30, hunger: 20, socialNeed: 20, mood: 70, isSleeping: true }, [], 'loc-casa');
    worldC.addAgent(sofiaC);
    const eventManagerC = new EventManager_1.EventManager(worldC, clockC);
    const engineC = new SimulationEngine_1.SimulationEngine(worldC, clockC, new AgentEngine_1.AgentEngine(worldC), new ActionExecutor_1.ActionExecutor(worldC, new RelationshipManager_1.RelationshipManager(), new MemoryManager_1.MemoryManager(), eventManagerC, clockC), eventManagerC);
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
    (0, strict_1.default)(Math.abs(sofiaC.state.energy - initialEnergy - 18) < 0.001, 'Sleep energy +18/h');
    (0, strict_1.default)(Math.abs(sofiaC.state.hunger - initialHunger - 2.4) < 0.001, 'Sleep hunger +2.4/h');
    (0, strict_1.default)(Math.abs(sofiaC.state.socialNeed - initialSocial - 1.8) < 0.001, 'Sleep social need +1.8/h');
    strict_1.default.equal(clockC.getDay(), 2, 'Clock advances to next day');
    strict_1.default.equal(clockC.getHour(), 0);
    strict_1.default.equal(clockC.getMinute(), 0);
    const anySocialEventC = worldC.events.some((e) => e.type === 'AGENTS_SOCIALIZED');
    (0, strict_1.default)(!anySocialEventC, "Cero socializaciones durante el sueño");
    console.log(`  ¿Cero socializaciones durante el sueño?: ${!anySocialEventC ? 'SÍ (✓)' : 'NO (✗)'}\n`);
    // ───────────────────────────────────────────────────────────────────────────
    // Caso D — Despertar a las 07:00
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Caso D — 06:55 -> 07:00 (Despertar)]');
    const worldD = new World_1.World('World D', locations);
    const clockD = new SimulationClock_1.SimulationClock(1, 6, 55); // 06:55
    const diegoD = new Agent_1.Agent('agent-diego-d', 'Diego', defaultPersonality, { energy: 90, hunger: 35, socialNeed: 30, mood: 70, isSleeping: true }, [], 'loc-casa');
    worldD.addAgent(diegoD);
    const eventManagerD = new EventManager_1.EventManager(worldD, clockD);
    const engineD = new SimulationEngine_1.SimulationEngine(worldD, clockD, new AgentEngine_1.AgentEngine(worldD), new ActionExecutor_1.ActionExecutor(worldD, new RelationshipManager_1.RelationshipManager(), new MemoryManager_1.MemoryManager(), eventManagerD, clockD), eventManagerD);
    engineD.tick(); // Pasa a 07:00
    console.log(`  Tiempo actual: ${clockD.getFormattedTime()}`);
    (0, strict_1.default)(!diegoD.state.isSleeping, "Diego despertó (isSleeping === false)");
    console.log(`  ¿Diego despertó (isSleeping === false)?: ${!diegoD.state.isSleeping ? 'SÍ (✓)' : 'NO (✗)'}`);
    const wakeEventD = worldD.events.find((e) => e.type === 'AGENT_WOKE_UP');
    (0, strict_1.default)(wakeEventD, "Evento AGENT_WOKE_UP registrado");
    console.log(`  ¿Evento AGENT_WOKE_UP registrado?: ${wakeEventD ? `SÍ (✓) -> "${wakeEventD.description}"` : 'NO (✗)'}\n`);
}
//# sourceMappingURL=testSleepCycle.js.map