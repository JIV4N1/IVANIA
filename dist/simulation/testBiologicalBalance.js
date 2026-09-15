"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIsolatedBiologicalTests = runIsolatedBiologicalTests;
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
function runIsolatedBiologicalTests() {
    console.log('━'.repeat(65));
    console.log('=== PRUEBAS AISLADAS: BALANCE BIOLÓGICO Y DEGRADACIÓN ===');
    console.log('━'.repeat(65) + '\n');
    const locations = [
        { id: 'loc-casa', name: 'Casa', type: 'home', capabilities: ['REST'] },
        { id: 'loc-cafe', name: 'Cafetería', type: 'restaurant', capabilities: ['EAT', 'SOCIALIZE'] },
    ];
    const defaultPersonality = {
        extroversion: 70, kindness: 70, curiosity: 70,
        impulsivity: 50, sociability: 70, patience: 60, confidence: 70,
    };
    // ───────────────────────────────────────────────────────────────────────────
    // Prueba 1 — 12 ticks diurnos (1 hora): hunger +9, energy -6
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Prueba 1 — 12 ticks diurnos (1 hora: 10:00 -> 11:00)]');
    const world1 = new World_1.World('World Bio 1', locations);
    const clock1 = new SimulationClock_1.SimulationClock(1, 10, 0); // 10:00 AM
    const agent1 = new Agent_1.Agent('agent-1', 'Ana', defaultPersonality, { energy: 80, hunger: 20, socialNeed: 20, mood: 70, isSleeping: false }, [], 'loc-cafe');
    world1.addAgent(agent1);
    const eventManager1 = new EventManager_1.EventManager(world1, clock1);
    const engine1 = new SimulationEngine_1.SimulationEngine(world1, clock1, new AgentEngine_1.AgentEngine(world1), new ActionExecutor_1.ActionExecutor(world1, new RelationshipManager_1.RelationshipManager(), new MemoryManager_1.MemoryManager(), eventManager1, clock1), eventManager1);
    for (let i = 0; i < 12; i++) {
        engine1.tick();
    }
    const hungerDeltaDay = agent1.state.hunger - 20;
    const energyDeltaDay = 80 - agent1.state.energy;
    console.log(`  Hambre inicial: 20 | Final: ${agent1.state.hunger.toFixed(2)} (Incremento: +${hungerDeltaDay.toFixed(2)}, esperado +9.00)`);
    console.log(`  Energía inicial: 80 | Final: ${agent1.state.energy.toFixed(2)} (Reducción: -${energyDeltaDay.toFixed(2)}, esperado -6.00)`);
    (0, strict_1.default)(Math.abs(hungerDeltaDay - 9) < 0.001 && Math.abs(energyDeltaDay - 6) < 0.001, "Incrementos diurnos correctos");
    console.log(`  ¿Incrementos diurnos correctos?: ${Math.abs(hungerDeltaDay - 9) < 0.001 && Math.abs(energyDeltaDay - 6) < 0.001 ? 'SÍ (✓)' : 'NO (✗)'}\n`);
    // ───────────────────────────────────────────────────────────────────────────
    // Prueba 2 — 12 ticks durmiendo (1 hora): hunger +2.4, energy +18, socialNeed +1.8
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Prueba 2 — 12 ticks durmiendo (1 hora: 01:00 -> 02:00)]');
    const world2 = new World_1.World('World Bio 2', locations);
    const clock2 = new SimulationClock_1.SimulationClock(1, 1, 0); // 01:00 AM (noche)
    const agent2 = new Agent_1.Agent('agent-2', 'Carlos', defaultPersonality, { energy: 30, hunger: 20, socialNeed: 20, mood: 70, isSleeping: true }, [], 'loc-casa');
    world2.addAgent(agent2);
    const eventManager2 = new EventManager_1.EventManager(world2, clock2);
    const engine2 = new SimulationEngine_1.SimulationEngine(world2, clock2, new AgentEngine_1.AgentEngine(world2), new ActionExecutor_1.ActionExecutor(world2, new RelationshipManager_1.RelationshipManager(), new MemoryManager_1.MemoryManager(), eventManager2, clock2), eventManager2);
    for (let i = 0; i < 12; i++) {
        engine2.tick();
    }
    const hungerDeltaSleep = agent2.state.hunger - 20;
    const energyDeltaSleep = agent2.state.energy - 30;
    const socialDeltaSleep = agent2.state.socialNeed - 20;
    console.log(`  Hambre inicial: 20 | Final: ${agent2.state.hunger.toFixed(2)} (Incremento: +${hungerDeltaSleep.toFixed(2)}, esperado +2.40)`);
    console.log(`  Energía inicial: 30 | Final: ${agent2.state.energy.toFixed(2)} (Incremento: +${energyDeltaSleep.toFixed(2)}, esperado +18.00)`);
    console.log(`  SocialNeed inicial: 20 | Final: ${agent2.state.socialNeed.toFixed(2)} (Incremento: +${socialDeltaSleep.toFixed(2)}, esperado +1.80)`);
    (0, strict_1.default)(Math.abs(hungerDeltaSleep - 2.4) < 0.001 && Math.abs(energyDeltaSleep - 18) < 0.001 && Math.abs(socialDeltaSleep - 1.8) < 0.001, "Deltas de sueño correctos");
    console.log(`  ¿Deltas de sueño correctos?: ${Math.abs(hungerDeltaSleep - 2.4) < 0.001 && Math.abs(energyDeltaSleep - 18) < 0.001 && Math.abs(socialDeltaSleep - 1.8) < 0.001 ? 'SÍ (✓)' : 'NO (✗)'}\n`);
    // ───────────────────────────────────────────────────────────────────────────
    // Prueba 3 — Acción EAT: reducción de 55 puntos de hambre (85 -> 30)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Prueba 3 — Acción EAT (Hambre: 85 -> 30)]');
    const world3 = new World_1.World('World Bio 3', locations);
    const clock3 = new SimulationClock_1.SimulationClock(1, 12, 0);
    const agent3 = new Agent_1.Agent('agent-3', 'Sofía', defaultPersonality, { energy: 80, hunger: 85, socialNeed: 20, mood: 70, isSleeping: false }, [], 'loc-cafe');
    world3.addAgent(agent3);
    const eventManager3 = new EventManager_1.EventManager(world3, clock3);
    const executor3 = new ActionExecutor_1.ActionExecutor(world3, new RelationshipManager_1.RelationshipManager(), new MemoryManager_1.MemoryManager(), eventManager3, clock3);
    const eatResult = executor3.execute(agent3, { intent: 'EAT', reason: 'Hambre alta' });
    console.log(`  Resultado de acción: ${eatResult.description}`);
    console.log(`  Hambre después de comer: ${agent3.state.hunger}`);
    (0, strict_1.default)(agent3.state.hunger === 30, "Hambre quedó exactamente en 30");
    console.log(`  ¿Hambre quedó exactamente en 30?: ${agent3.state.hunger === 30 ? 'SÍ (✓)' : 'NO (✗)'}\n`);
    // ───────────────────────────────────────────────────────────────────────────
    // Prueba 4 — Verificación de límites clamp [0, 100]
    // ───────────────────────────────────────────────────────────────────────────
    console.log('[Prueba 4 — Verificación de límites (Clamp 0-100)]');
    const agentClamp = new Agent_1.Agent('agent-clamp', 'Diego', defaultPersonality, { energy: 95, hunger: 20, socialNeed: 20, mood: 70, isSleeping: false }, [], 'loc-cafe');
    world3.addAgent(agentClamp);
    // Intentar comer cuando el hambre es baja (20 - 55 = -35 -> debe clamplearse a 0)
    executor3.execute(agentClamp, { intent: 'EAT', reason: 'Comer con poco hambre' });
    console.log(`  Hambre tras reducción excesiva (20 - 55): ${agentClamp.state.hunger} (esperado 0)`);
    (0, strict_1.default)(agentClamp.state.hunger === 0, "Límite inferior respetado");
    console.log(`  ¿Límite inferior respetado?: ${agentClamp.state.hunger === 0 ? 'SÍ (✓)' : 'NO (✗)'}\n`);
}
//# sourceMappingURL=testBiologicalBalance.js.map