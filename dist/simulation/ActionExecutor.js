"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionExecutor = void 0;
const numberUtils_1 = require("../utils/numberUtils");
// ─── Magnitudes de efecto ─────────────────────────────────────────────────────
const EAT_HUNGER_REDUCTION = 55;
const REST_ENERGY_RECOVERY = 30;
const SOCIALIZE_INITIATOR_REDUCTION = 30;
const SOCIALIZE_TARGET_REDUCTION = 20;
// ─── Ejecutor de acciones ─────────────────────────────────────────────────────
/**
 * Toma una AgentDecision y aplica su efecto sobre el agente.
 *
 * Responsabilidades:
 *  - Traducir una intención en un cambio de Agent (state o locationId).
 *  - Devolver un ActionResult que describe lo que ocurrió.
 *  - Delegar la actualización de relaciones a RelationshipManager cuando SOCIALIZE es exitoso.
 *  - Delegar la creación y registro de recuerdos a MemoryManager cuando SOCIALIZE es exitoso.
 *  - Delegar la creación y registro de eventos globales a EventManager cuando las acciones son exitosas.
 *
 * NO decide qué acción tomar (AgentEngine).
 * NO coordina el flujo del tick (SimulationEngine).
 */
class ActionExecutor {
    world;
    relationshipManager;
    memoryManager;
    eventManager;
    clock;
    constructor(world, relationshipManager, memoryManager, eventManager, clock) {
        this.world = world;
        this.relationshipManager = relationshipManager;
        this.memoryManager = memoryManager;
        this.eventManager = eventManager;
        this.clock = clock;
    }
    /**
     * Ejecuta la acción correspondiente a la decisión del agente.
     * Puede actualizar agent.state o agent.locationId según la intención.
     */
    execute(agent, decision) {
        const intent = decision.intent;
        if (intent === 'EAT' || intent === 'REST' || intent === 'WORK') {
            const location = this.world.getLocationById(agent.locationId);
            if (!location?.capabilities.includes(intent)) {
                return {
                    agentId: agent.id,
                    intent,
                    success: false,
                    description: `${agent.name} no puede ejecutar ${intent} en ${agent.locationId}.`,
                };
            }
        }
        switch (decision.intent) {
            case 'EAT': return this.executeEat(agent);
            case 'REST': return this.executeRest(agent);
            case 'WORK': return this.executeWork(agent);
            case 'SOCIALIZE': return this.executeSocialize(agent, decision);
            case 'IDLE': return this.executeIdle(agent);
            case 'MOVE': return this.executeMove(agent, decision);
        }
    }
    // ─── Handlers por intención ───────────────────────────────────────────────
    executeEat(agent) {
        const before = agent.state.hunger;
        agent.state = this.withState(agent.state, {
            hunger: (0, numberUtils_1.clamp)(agent.state.hunger - EAT_HUNGER_REDUCTION, 0, 100),
        });
        const locationName = this.world.getLocationById(agent.locationId)?.name ?? agent.locationId;
        this.eventManager.recordAgentAte(agent, locationName, agent.locationId);
        return {
            agentId: agent.id,
            intent: 'EAT',
            success: true,
            description: `${agent.name} comió. Hambre: ${before} → ${agent.state.hunger}.`,
        };
    }
    executeRest(agent) {
        const before = agent.state.energy;
        agent.state = this.withState(agent.state, {
            energy: (0, numberUtils_1.clamp)(agent.state.energy + REST_ENERGY_RECOVERY, 0, 100),
        });
        const locationName = this.world.getLocationById(agent.locationId)?.name ?? agent.locationId;
        this.eventManager.recordAgentRested(agent, locationName, agent.locationId);
        return {
            agentId: agent.id,
            intent: 'REST',
            success: true,
            description: `${agent.name} descansó. Energía: ${before} → ${agent.state.energy}.`,
        };
    }
    executeWork(agent) {
        const beforeEnergy = agent.state.energy;
        const beforeHunger = agent.state.hunger;
        agent.state = this.withState(agent.state, {
            energy: (0, numberUtils_1.clamp)(agent.state.energy - 1, 0, 100),
            hunger: (0, numberUtils_1.clamp)(agent.state.hunger + 0.5, 0, 100),
        });
        const locationName = this.world.getLocationById(agent.locationId)?.name ?? agent.locationId;
        this.eventManager.recordAgentWorked(agent, locationName, agent.locationId);
        return {
            agentId: agent.id,
            intent: 'WORK',
            success: true,
            description: `${agent.name} trabajó en ${locationName}. Energía: ${beforeEnergy.toFixed(1)} → ${agent.state.energy.toFixed(1)}, Hambre: ${beforeHunger.toFixed(1)} → ${agent.state.hunger.toFixed(1)}.`,
        };
    }
    executeSocialize(agent, decision) {
        // 1. Validar que exista targetAgentId
        if (!decision.targetAgentId) {
            return {
                agentId: agent.id,
                intent: 'SOCIALIZE',
                success: false,
                description: `${agent.name} quiere socializar pero no se especificó un agente objetivo.`,
            };
        }
        // 2. Validar que no intente socializar consigo mismo
        if (decision.targetAgentId === agent.id) {
            return {
                agentId: agent.id,
                intent: 'SOCIALIZE',
                success: false,
                description: `${agent.name} no puede socializar consigo mismo/a.`,
            };
        }
        // 3. Validar que el agente objetivo exista en World
        const targetAgent = this.world.getAgentById(decision.targetAgentId);
        if (!targetAgent) {
            return {
                agentId: agent.id,
                intent: 'SOCIALIZE',
                success: false,
                description: `${agent.name} quiere socializar con "${decision.targetAgentId}", pero ese agente no existe en el mundo.`,
            };
        }
        // 4. Validar que ambos agentes estén en la misma ubicación
        if (agent.locationId !== targetAgent.locationId) {
            return {
                agentId: agent.id,
                intent: 'SOCIALIZE',
                success: false,
                description: `${agent.name} y ${targetAgent.name} están en ubicaciones diferentes.`,
            };
        }
        // Interacción social válida: reducir socialNeed de ambos agentes
        if (targetAgent.state.isSleeping) {
            return {
                agentId: agent.id,
                intent: 'SOCIALIZE',
                success: false,
                description: `${targetAgent.name} está durmiendo.`,
            };
        }
        const initBefore = agent.state.socialNeed;
        const targetBefore = targetAgent.state.socialNeed;
        const initAfter = (0, numberUtils_1.clamp)(initBefore - SOCIALIZE_INITIATOR_REDUCTION, 0, 100);
        const targetAfter = (0, numberUtils_1.clamp)(targetBefore - SOCIALIZE_TARGET_REDUCTION, 0, 100);
        agent.state = this.withState(agent.state, { socialNeed: initAfter });
        targetAgent.state = this.withState(targetAgent.state, { socialNeed: targetAfter });
        // Actualizar la relación entre ambos agentes (en ambas direcciones)
        this.relationshipManager.applySocialInteraction(agent, targetAgent);
        // Registrar los recuerdos independientes de la interacción para ambos agentes
        const locationName = this.world.getLocationById(agent.locationId)?.name ?? agent.locationId;
        this.memoryManager.recordSocialInteraction(agent, targetAgent, locationName, this.clock);
        // Registrar el evento global en el mundo
        this.eventManager.recordAgentsSocialized(agent, targetAgent, locationName, agent.locationId);
        return {
            agentId: agent.id,
            intent: 'SOCIALIZE',
            success: true,
            description: `${agent.name} socialized with ${targetAgent.name}. ${agent.name} socialNeed: ${initBefore} → ${agent.state.socialNeed}. ${targetAgent.name}: ${targetBefore} → ${targetAgent.state.socialNeed}.`,
        };
    }
    executeIdle(agent) {
        return {
            agentId: agent.id,
            intent: 'IDLE',
            success: true,
            description: `${agent.name} permanece inactivo/a.`,
        };
    }
    executeMove(agent, decision) {
        // Validar que la decisión incluye un destino
        if (!decision.targetLocationId) {
            return {
                agentId: agent.id,
                intent: 'MOVE',
                success: false,
                description: `${agent.name} quiere moverse pero no se especificó un destino.`,
            };
        }
        // Validar que el destino existe en el mundo
        const destination = this.world.getLocationById(decision.targetLocationId);
        if (!destination) {
            return {
                agentId: agent.id,
                intent: 'MOVE',
                success: false,
                description: `${agent.name} quiere ir a "${decision.targetLocationId}", pero esa ubicación no existe.`,
            };
        }
        // Evitar "mover" al agente a donde ya está
        if (agent.locationId === destination.id) {
            return {
                agentId: agent.id,
                intent: 'MOVE',
                success: false,
                description: `${agent.name} ya está en "${destination.name}".`,
            };
        }
        // Movimiento instantáneo
        const originName = this.world.getLocationById(agent.locationId)?.name ?? agent.locationId;
        agent.locationId = destination.id;
        // Registrar evento global de movimiento
        this.eventManager.recordAgentMoved(agent, destination);
        return {
            agentId: agent.id,
            intent: 'MOVE',
            success: true,
            description: `${agent.name} se movió de "${originName}" a "${destination.name}".`,
        };
    }
    // ─── Utilidad de estado inmutable ─────────────────────────────────────────
    /**
     * Devuelve un nuevo AgentState aplicando solo los campos del patch.
     * El resto de campos se mantienen inalterados.
     */
    withState(state, patch) {
        return { ...state, ...patch };
    }
}
exports.ActionExecutor = ActionExecutor;
//# sourceMappingURL=ActionExecutor.js.map