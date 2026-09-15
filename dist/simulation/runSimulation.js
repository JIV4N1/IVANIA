"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDaySimulation = runDaySimulation;
const SocialMetrics_1 = require("./SocialMetrics");
const Agent_1 = require("../agents/Agent");
const World_1 = require("../world/World");
const SimulationClock_1 = require("./SimulationClock");
const SimulationEngine_1 = require("./SimulationEngine");
const AgentEngine_1 = require("../agents/AgentEngine");
const ActionExecutor_1 = require("./ActionExecutor");
const RelationshipManager_1 = require("../relationships/RelationshipManager");
const MemoryManager_1 = require("../memory/MemoryManager");
const EventManager_1 = require("../events/EventManager");
function runDaySimulation() {
    // ─── 1. Ubicaciones del mundo ─────────────────────────────────────────────
    const locations = [
        { id: 'loc-casa', name: 'Casa', type: 'home', capabilities: ['REST'] },
        { id: 'loc-parque', name: 'Parque', type: 'park', capabilities: ['SOCIALIZE'] },
        { id: 'loc-cafe', name: 'Cafetería', type: 'restaurant', capabilities: ['EAT', 'SOCIALIZE'] },
        { id: 'loc-trabajo', name: 'Trabajo', type: 'work', capabilities: ['WORK'] },
    ];
    // ─── 2. Definición de 5 agentes con personalidades y estados iniciales ─────
    const personalities = {
        Ana: {
            extroversion: 90, kindness: 75, curiosity: 80,
            impulsivity: 60, sociability: 95, patience: 50, confidence: 85,
        },
        Carlos: {
            extroversion: 30, kindness: 80, curiosity: 45,
            impulsivity: 25, sociability: 35, patience: 90, confidence: 60,
        },
        Sofia: {
            extroversion: 80, kindness: 85, curiosity: 95,
            impulsivity: 55, sociability: 85, patience: 60, confidence: 75,
        },
        Diego: {
            extroversion: 45, kindness: 50, curiosity: 60,
            impulsivity: 85, sociability: 40, patience: 30, confidence: 70,
        },
        Mariana: {
            extroversion: 65, kindness: 90, curiosity: 70,
            impulsivity: 40, sociability: 70, patience: 75, confidence: 85,
        },
    };
    const agents = [
        new Agent_1.Agent('agent-ana', 'Ana', personalities.Ana, { energy: 90, hunger: 25, socialNeed: 50, mood: 75, isSleeping: false }, [], 'loc-casa'),
        new Agent_1.Agent('agent-carlos', 'Carlos', personalities.Carlos, { energy: 70, hunger: 40, socialNeed: 30, mood: 65, isSleeping: false }, [], 'loc-trabajo'),
        new Agent_1.Agent('agent-sofia', 'Sofía', personalities.Sofia, { energy: 85, hunger: 15, socialNeed: 65, mood: 80, isSleeping: false }, [], 'loc-parque'),
        new Agent_1.Agent('agent-diego', 'Diego', personalities.Diego, { energy: 60, hunger: 60, socialNeed: 20, mood: 55, isSleeping: false }, [], 'loc-cafe'),
        new Agent_1.Agent('agent-mariana', 'Mariana', personalities.Mariana, { energy: 75, hunger: 35, socialNeed: 45, mood: 70, isSleeping: false }, [], 'loc-casa'),
    ];
    // ─── 3. Inicialización del entorno y motores ──────────────────────────────
    const world = new World_1.World('IVANIA City', locations, agents);
    const initialKnownAgents = (0, SocialMetrics_1.captureKnownAgents)(world.agents);
    const clock = new SimulationClock_1.SimulationClock(1, 0, 0); // Día 1 - 00:00
    const agentEngine = new AgentEngine_1.AgentEngine(world);
    const relationshipManager = new RelationshipManager_1.RelationshipManager();
    const memoryManager = new MemoryManager_1.MemoryManager();
    const eventManager = new EventManager_1.EventManager(world, clock);
    const actionExecutor = new ActionExecutor_1.ActionExecutor(world, relationshipManager, memoryManager, eventManager, clock);
    const simulationEngine = new SimulationEngine_1.SimulationEngine(world, clock, agentEngine, actionExecutor, eventManager);
    console.log('=== IVANIA — SIMULACIÓN DÍA 1 (24 HORAS CON BALANCE BIOLÓGICO) ===\n');
    const TOTAL_TICKS = 288;
    let lastEventCount = 0;
    const sleepingTicksByAgent = {
        'agent-ana': 0,
        'agent-carlos': 0,
        'agent-sofia': 0,
        'agent-diego': 0,
        'agent-mariana': 0,
    };
    const energyAtWakeup = {};
    const firstMealAfter0700 = {};
    const workAgents = agents.map(agent => ({
        name: agent.name, firstArrival: null, lastWork: null, ticksAtWork: 0,
        workTicks: 0, eatInterruptions: 0, restInterruptions: 0, workdayPresencePercent: 0,
    }));
    let scheduledTicks = 0;
    let outsideHoursActions = 0;
    const failedActions = [];
    // ─── 4. Bucle principal de simulación ──────────────────────────────────────
    for (let tickIndex = 1; tickIndex <= TOTAL_TICKS; tickIndex++) {
        const tickResults = simulationEngine.tick();
        for (const [agentId, result] of tickResults) {
            if (!result.action.success)
                failedActions.push({
                    time: clock.getFormattedTime(),
                    agent: world.getAgentById(agentId)?.name ?? agentId,
                    intent: result.decision.intent,
                    targetAgentId: result.decision.targetAgentId,
                    targetLocationId: result.decision.targetLocationId,
                    description: result.action.description,
                });
        }
        const currentHour = clock.getHour();
        const currentMinute = clock.getMinute();
        const inWorkday = (0, AgentEngine_1.isWorkingHour)(currentHour);
        if (inWorkday)
            scheduledTicks++;
        for (const [index, agent] of agents.entries()) {
            const action = tickResults.get(agent.id)?.action;
            const metrics = workAgents[index];
            if (!action?.success)
                continue;
            if (action.intent === 'WORK' && !inWorkday)
                outsideHoursActions++;
            if (!inWorkday)
                continue;
            // Post-tick occupancy samples: approximate presence, including arrival ticks.
            if (world.getLocationById(agent.locationId)?.capabilities.includes('WORK')) {
                metrics.ticksAtWork++;
                metrics.firstArrival ??= clock.getFormattedTime();
            }
            if (action.intent === 'WORK') {
                metrics.workTicks++;
                metrics.lastWork = clock.getFormattedTime();
            }
            // Count completed EAT/REST actions during the workday, not travel ticks.
            if (action.intent === 'EAT')
                metrics.eatInterruptions++;
            if (action.intent === 'REST')
                metrics.restInterruptions++;
        }
        // Capturar el estado al finalizar el tick de las 07:00.
        if (currentHour === 7 && currentMinute === 0) {
            for (const agent of world.agents) {
                energyAtWakeup[agent.id] = agent.state.energy;
            }
        }
        // Contar ticks durmiendo
        for (const agent of world.agents) {
            if (agent.state.isSleeping) {
                sleepingTicksByAgent[agent.id] = (sleepingTicksByAgent[agent.id] ?? 0) + 1;
            }
        }
        // Mostrar eventos nuevos ocurridos en este tick
        const currentEvents = eventManager.getEvents();
        if (currentEvents.length > lastEventCount) {
            for (let i = lastEventCount; i < currentEvents.length; i++) {
                const ev = currentEvents[i];
                const hh = String(ev.hour).padStart(2, '0');
                const mm = String(ev.minute).padStart(2, '0');
                console.log(`Día ${ev.day} - ${hh}:${mm} | ${ev.description}`);
                // Registrar primera comida después de las 07:00
                if (ev.type === 'AGENT_ATE' && (ev.hour >= 7 && ev.hour < 23)) {
                    for (const agentId of ev.agentIds) {
                        if (!firstMealAfter0700[agentId]) {
                            firstMealAfter0700[agentId] = `${hh}:${mm}`;
                        }
                    }
                }
            }
            lastEventCount = currentEvents.length;
        }
    }
    // ─── 5. Recopilación de estadísticas y resumen final ──────────────────────
    const allEvents = eventManager.getEvents();
    const social = (0, SocialMetrics_1.summarizeSocialInteractions)(world.agents, allEvents, initialKnownAgents);
    console.log('FAILED_ACTIONS ' + JSON.stringify(failedActions));
    console.log('SOCIAL_METRICS ' + JSON.stringify(social));
    const eventsByType = {
        AGENT_WORKED: allEvents.filter((e) => e.type === 'AGENT_WORKED').length,
        AGENT_MOVED: allEvents.filter((e) => e.type === 'AGENT_MOVED').length,
        AGENT_ATE: allEvents.filter((e) => e.type === 'AGENT_ATE').length,
        AGENT_RESTED: allEvents.filter((e) => e.type === 'AGENT_RESTED').length,
        AGENTS_SOCIALIZED: allEvents.filter((e) => e.type === 'AGENTS_SOCIALIZED').length,
        AGENT_WENT_TO_SLEEP: allEvents.filter((e) => e.type === 'AGENT_WENT_TO_SLEEP').length,
        AGENT_WOKE_UP: allEvents.filter((e) => e.type === 'AGENT_WOKE_UP').length,
    };
    for (const metrics of workAgents) {
        metrics.workdayPresencePercent = scheduledTicks === 0 ? 0 : metrics.ticksAtWork / scheduledTicks * 100;
    }
    const work = {
        scheduledTicks,
        events: eventsByType.AGENT_WORKED,
        outsideHoursEvents: allEvents.filter(e => e.type === 'AGENT_WORKED' && !(0, AgentEngine_1.isWorkingHour)(e.hour)).length,
        outsideHoursActions,
        socializationsDuringWork: allEvents.filter(e => e.type === 'AGENTS_SOCIALIZED' && (0, AgentEngine_1.isWorkingHour)(e.hour)).length,
        agents: workAgents,
    };
    console.log('WORK_METRICS ' + JSON.stringify(work));
    const isNightEvent = (e) => e.hour >= 23 || e.hour < 7;
    const nightEvents = allEvents.filter(isNightEvent);
    const nightMovements = nightEvents.filter((e) => e.type === 'AGENT_MOVED').length;
    const nightSocializations = nightEvents.filter((e) => e.type === 'AGENTS_SOCIALIZED').length;
    // Número de agentes que comen inmediatamente entre 07:00 y 07:30
    const immediateBreakfastMeals = allEvents.filter((e) => e.type === 'AGENT_ATE' && e.hour === 7 && e.minute <= 30);
    const immediateBreakfastCount = immediateBreakfastMeals.length;
    console.log('\n' + '━'.repeat(65));
    console.log('=== FIN DEL DÍA — RESUMEN GLOBAL DEL MUNDO ===');
    console.log('━'.repeat(65));
    console.log(`Total de ticks ejecutados: ${TOTAL_TICKS} (Hora final: ${clock.getFormattedTime()})`);
    console.log(`Eventos totales          : ${allEvents.length}`);
    console.log(`  - Movimientos (AGENT_MOVED)          : ${eventsByType.AGENT_MOVED}`);
    console.log(`  - Comidas (AGENT_ATE)                : ${eventsByType.AGENT_ATE}`);
    console.log(`  - Descansos diurnos (AGENT_RESTED)   : ${eventsByType.AGENT_RESTED}`);
    console.log(`  - Socializaciones (AGENTS_SOCIALIZED): ${eventsByType.AGENTS_SOCIALIZED}`);
    console.log(`  - Entradas al sueño (AGENT_WENT_TO_SLEEP): ${eventsByType.AGENT_WENT_TO_SLEEP}`);
    console.log(`  - Trabajo (AGENT_WORKED)             : ${eventsByType.AGENT_WORKED}`);
    console.log(`  - Despertares (AGENT_WOKE_UP)        : ${eventsByType.AGENT_WOKE_UP}`);
    console.log('\n--- Métricas de Rutina y Balance Biológico ---');
    console.log(`Total de comidas en 24h              : ${eventsByType.AGENT_ATE}`);
    console.log(`Comidas inmediatas post-despertar (07:00-07:30): ${immediateBreakfastCount} (en ${agents.length} agentes)`);
    console.log(`Socializaciones nocturnas            : ${nightSocializations}`);
    // ─── 6. Resumen por agente ────────────────────────────────────────────────
    console.log('\n' + '━'.repeat(65));
    console.log('=== RESUMEN POR AGENTE ===');
    console.log('━'.repeat(65));
    const agentSummaries = agents.map((agent) => {
        const locName = world.getLocationById(agent.locationId)?.name ?? agent.locationId;
        const eventsForAgent = eventManager.getEventsForAgent(agent.id);
        const meals = eventsForAgent.filter((e) => e.type === 'AGENT_ATE');
        const socialEvents = eventsForAgent.filter((e) => e.type === 'AGENTS_SOCIALIZED');
        const sleepEvents = eventsForAgent.filter((e) => e.type === 'AGENT_WENT_TO_SLEEP');
        const wakeEvents = eventsForAgent.filter((e) => e.type === 'AGENT_WOKE_UP');
        const threshold = agentEngine.getSocialThreshold(agent);
        const sleepHours = ((sleepingTicksByAgent[agent.id] ?? 0) * 5) / 60;
        const wakeupEnergy = energyAtWakeup[agent.id] ?? agent.state.energy;
        const firstMeal = firstMealAfter0700[agent.id] ?? 'Ninguna';
        const rels = agent.relationships.map((rel) => {
            const other = world.getAgentById(rel.agentId);
            return {
                targetAgentName: other?.name ?? rel.agentId,
                familiarity: rel.familiarity,
                trust: rel.trust,
                affinity: rel.affinity,
                friendship: rel.friendship,
            };
        });
        console.log(`\n${agent.name} (Extroversión: ${agent.personality.extroversion} | Umbral Social: ${threshold}):`);
        console.log(`  Ubicación final    : ${locName}`);
        console.log(`  Hambre final       : ${agent.state.hunger.toFixed(1)}`);
        console.log(`  Energía final      : ${agent.state.energy.toFixed(1)}`);
        console.log(`  Energía tras tick 07:00: ${wakeupEnergy.toFixed(1)}`);
        console.log(`  Primera comida post-07:00   : ${firstMeal}`);
        console.log(`  Comidas realizadas en el día: ${meals.length}`);
        console.log(`  Necesidad social   : ${agent.state.socialNeed.toFixed(1)}`);
        console.log(`  Mood final         : ${agent.state.mood}`);
        console.log(`  Estado de sueño    : ${agent.state.isSleeping ? 'Durmiendo' : 'Despierto/a'}`);
        console.log(`  Horas dormidas     : ${sleepHours.toFixed(1)} h`);
        console.log(`  Total memorias     : ${agent.memories.length}`);
        console.log(`  Total relaciones   : ${agent.relationships.length}`);
        console.log(`  Eventos participados: ${eventsForAgent.length} (Socializaciones: ${socialEvents.length})`);
        if (rels.length > 0) {
            console.log('  Relaciones:');
            for (const r of rels) {
                console.log(`    → Con ${r.targetAgentName}: familiaridad=${r.familiarity}, confianza=${r.trust}, afinidad=${r.affinity}, amistad=${r.friendship}`);
            }
        }
        else {
            console.log('  Relaciones: (sin interacciones)');
        }
        return {
            id: agent.id,
            name: agent.name,
            extroversion: agent.personality.extroversion,
            socialThreshold: threshold,
            finalLocation: locName,
            hunger: agent.state.hunger,
            energy: agent.state.energy,
            socialNeed: agent.state.socialNeed,
            mood: agent.state.mood,
            isSleeping: agent.state.isSleeping,
            energyAtWakeup: wakeupEnergy,
            firstMealAfter0700: firstMeal,
            memoriesCount: agent.memories.length,
            relationshipsCount: agent.relationships.length,
            eventsCount: eventsForAgent.length,
            mealsCount: meals.length,
            socialEventsCount: socialEvents.length,
            sleepEventsCount: sleepEvents.length,
            wakeEventsCount: wakeEvents.length,
            effectiveSleepHours: sleepHours,
            relationships: rels,
        };
    });
    // ─── 7. Análisis y diagnóstico ────────────────────────────────────────────
    console.log('\n' + '━'.repeat(65));
    console.log('=== ANÁLISIS DE COMPORTAMIENTO Y DIAGNÓSTICO ===');
    console.log('━'.repeat(65));
    const warnings = [];
    const successes = [];
    console.log(`Frecuencia observada: ${eventsByType.AGENT_ATE} comidas totales; promedio ${(eventsByType.AGENT_ATE / agents.length).toFixed(1)} comidas por agente.`);
    // Cero socializaciones nocturnas
    if (nightSocializations === 0) {
        successes.push('Cero socializaciones durante el horario nocturno (23:00 - 07:00).');
    }
    else {
        warnings.push(`Se detectaron ${nightSocializations} socializaciones indebidas durante la noche.`);
    }
    console.log(`Comidas entre 07:00 y 07:30: ${immediateBreakfastCount}; agentes: ${agents.length}.`);
    for (const s of successes) {
        console.log(`✓ ${s}`);
    }
    for (const w of warnings) {
        console.log(`⚠ ${w}`);
    }
    console.log('\n=== Simulación de 24 horas completada ===\n');
    return {
        failedActions,
        social,
        work,
        totalTicks: TOTAL_TICKS,
        totalEvents: allEvents.length,
        eventsByType,
        nightEventsCount: nightEvents.length,
        nightMovementsCount: nightMovements,
        nightSocializationsCount: nightSocializations,
        immediateBreakfastCount,
        agentSummaries,
        warnings,
        successes,
    };
}
//# sourceMappingURL=runSimulation.js.map