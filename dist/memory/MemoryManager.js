"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const crypto_1 = require("crypto");
const SOCIAL_INTERACTION_IMPORTANCE = 40;
class MemoryManager {
    /**
     * Registra una interacción social entre dos agentes.
     * Crea dos objetos Memory independientes con sus propios IDs y descripciones,
     * y los almacena en `agent.memories` y `otherAgent.memories` respectivamente.
     */
    recordSocialInteraction(initiator, target, locationName, clock) {
        const memoryInitiator = {
            id: (0, crypto_1.randomUUID)(),
            type: 'SOCIAL_INTERACTION',
            description: `${initiator.name} socialized with ${target.name} at ${locationName}.`,
            involvedAgentIds: [target.id],
            locationId: initiator.locationId,
            day: clock.getDay(),
            hour: clock.getHour(),
            minute: clock.getMinute(),
            importance: SOCIAL_INTERACTION_IMPORTANCE,
        };
        const memoryTarget = {
            id: (0, crypto_1.randomUUID)(),
            type: 'SOCIAL_INTERACTION',
            description: `${target.name} socialized with ${initiator.name} at ${locationName}.`,
            involvedAgentIds: [initiator.id],
            locationId: target.locationId,
            day: clock.getDay(),
            hour: clock.getHour(),
            minute: clock.getMinute(),
            importance: SOCIAL_INTERACTION_IMPORTANCE,
        };
        initiator.memories.push(memoryInitiator);
        target.memories.push(memoryTarget);
        return [memoryInitiator, memoryTarget];
    }
    /**
     * Devuelve la lista completa de memorias de un agente.
     */
    getMemories(agent) {
        return agent.memories;
    }
    /**
     * Devuelve las memorias de un agente que involucran a `otherAgentId`.
     */
    getMemoriesInvolving(agent, otherAgentId) {
        return agent.memories.filter((m) => m.involvedAgentIds.includes(otherAgentId));
    }
}
exports.MemoryManager = MemoryManager;
//# sourceMappingURL=MemoryManager.js.map