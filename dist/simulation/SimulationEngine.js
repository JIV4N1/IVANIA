"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationEngine = void 0;
const numberUtils_1 = require("../utils/numberUtils");
// ─── Deltas por tick (5 minutos simulados) durante el día ────────────────────
const HUNGER_PER_TICK = 0.75;
const ENERGY_PER_TICK = -0.5;
const SOCIAL_NEED_PER_TICK = 1;
// ─── Deltas por tick (5 minutos simulados) durante el sueño nocturno ─────────
const SLEEP_ENERGY_RECOVERY = 1.5;
const SLEEP_HUNGER_INCREASE = 0.2;
const SLEEP_SOCIAL_INCREASE = 0.15;
// ─── Horario global de sueño ──────────────────────────────────────────────────
const SLEEP_START_HOUR = 23; // 23:00
const SLEEP_END_HOUR = 7; // 07:00
// ─── Motor de simulación ──────────────────────────────────────────────────────
class SimulationEngine {
    world;
    clock;
    agentEngine;
    actionExecutor;
    eventManager;
    constructor(world, clock, agentEngine, actionExecutor, eventManager) {
        this.world = world;
        this.clock = clock;
        this.agentEngine = agentEngine;
        this.actionExecutor = actionExecutor;
        this.eventManager = eventManager;
    }
    /**
     * Advance once, prepare all biological states, then collect all decisions.
     * Execute only after collection, in the existing agent order, without replanning.
     * Sleep transitions are prepared with biology and their events emitted at execution.
     */
    tick() {
        this.clock.tick();
        const hour = this.clock.getHour();
        const isNightTime = hour >= SLEEP_START_HOUR || hour < SLEEP_END_HOUR;
        const decisions = new Map();
        const transitions = new Map();
        const sleepDescriptions = new Map();
        const results = new Map();
        // Phase 1a: finish every agent's own biological update before anyone perceives.
        // No action, movement, relationship, memory or event changes happen here.
        for (const agent of this.world.agents) {
            const location = this.world.getLocationById(agent.locationId);
            if (isNightTime && (agent.state.isSleeping || location?.capabilities.includes('REST'))) {
                const enteringSleep = !agent.state.isSleeping;
                if (enteringSleep)
                    transitions.set(agent.id, 'sleep');
                agent.state = this.applySleepDelta(agent.state);
                const locationName = location?.name ?? agent.locationId;
                decisions.set(agent.id, Object.freeze({
                    intent: 'IDLE',
                    reason: enteringSleep
                        ? `${agent.name} went to sleep at ${locationName}.`
                        : `${agent.name} is sleeping peacefully.`,
                }));
                sleepDescriptions.set(agent.id, enteringSleep
                    ? `${agent.name} se fue a dormir en ${locationName}.`
                    : `${agent.name} está durmiendo.`);
            }
            else {
                if (!isNightTime && agent.state.isSleeping) {
                    transitions.set(agent.id, 'wake');
                    agent.state = { ...agent.state, isSleeping: false };
                }
                agent.state = this.applyAwakeDelta(agent.state);
            }
        }
        // Phase 1b: the shared world stays unchanged throughout normal decisions.
        for (const agent of this.world.agents) {
            if (decisions.has(agent.id))
                continue; // Sleeping agents do not decide normally.
            const restDestination = isNightTime
                ? this.world.locations.find(location => location.capabilities.includes('REST'))
                : undefined;
            const decision = restDestination && restDestination.id !== agent.locationId
                ? {
                    intent: 'MOVE',
                    targetLocationId: restDestination.id,
                    reason: `${agent.name} needs to sleep and is moving to "${restDestination.name}".`,
                }
                : this.agentEngine.decide(agent, hour);
            decisions.set(agent.id, Object.freeze({ ...decision }));
        }
        // Phase 2: revalidation is performed by ActionExecutor against current state.
        for (const agent of this.world.agents) {
            const decision = decisions.get(agent.id);
            const transition = transitions.get(agent.id);
            const locationName = this.world.getLocationById(agent.locationId)?.name ?? agent.locationId;
            if (transition === 'sleep') {
                this.eventManager.recordAgentWentToSleep(agent, locationName, agent.locationId);
            }
            else if (transition === 'wake') {
                this.eventManager.recordAgentWokeUp(agent, locationName, agent.locationId);
            }
            const sleepingDescription = sleepDescriptions.get(agent.id);
            const action = sleepingDescription !== undefined
                ? { agentId: agent.id, intent: decision.intent, success: true, description: sleepingDescription }
                : this.actionExecutor.execute(agent, decision);
            results.set(agent.id, { decision, action });
        }
        return results;
    }
    /** Aplica los efectos del sueño nocturno por tick */
    applySleepDelta(state) {
        return {
            energy: (0, numberUtils_1.clamp)(state.energy + SLEEP_ENERGY_RECOVERY, 0, 100),
            hunger: (0, numberUtils_1.clamp)(state.hunger + SLEEP_HUNGER_INCREASE, 0, 100),
            socialNeed: (0, numberUtils_1.clamp)(state.socialNeed + SLEEP_SOCIAL_INCREASE, 0, 100),
            mood: state.mood,
            isSleeping: true,
        };
    }
    /** Aplica los deltas diurnos normales por tick */
    applyAwakeDelta(state) {
        return {
            hunger: (0, numberUtils_1.clamp)(state.hunger + HUNGER_PER_TICK, 0, 100),
            energy: (0, numberUtils_1.clamp)(state.energy + ENERGY_PER_TICK, 0, 100),
            socialNeed: (0, numberUtils_1.clamp)(state.socialNeed + SOCIAL_NEED_PER_TICK, 0, 100),
            mood: state.mood,
            isSleeping: state.isSleeping,
        };
    }
}
exports.SimulationEngine = SimulationEngine;
//# sourceMappingURL=SimulationEngine.js.map