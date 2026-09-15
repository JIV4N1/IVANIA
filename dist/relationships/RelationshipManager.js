"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipManager = void 0;
// ─── Incrementos por interacción social ───────────────────────────────────────
const FAMILIARITY_INCREMENT = 10;
const TRUST_INCREMENT = 3;
const AFFINITY_INCREMENT = 5;
const FRIENDSHIP_INCREMENT = 2;
const numberUtils_1 = require("../utils/numberUtils");
class RelationshipManager {
    /**
     * Obtiene la relación existente entre `agent` y `otherAgentId`.
     * Devuelve `undefined` si no existe una relación aún.
     */
    getRelationship(agent, otherAgentId) {
        return agent.relationships.find((rel) => rel.agentId === otherAgentId);
    }
    /**
     * Obtiene la relación de `agent` hacia `otherAgentId`.
     * Si no existe, la crea con valores iniciales en 0 y la agrega a `agent.relationships`.
     */
    getOrCreateRelationship(agent, otherAgentId) {
        let rel = this.getRelationship(agent, otherAgentId);
        if (!rel) {
            rel = {
                agentId: otherAgentId,
                familiarity: 0,
                trust: 0,
                affinity: 0,
                friendship: 0,
            };
            agent.relationships.push(rel);
        }
        return rel;
    }
    /**
     * Aplica el incremento de socialización a la relación en ambas direcciones:
     *  - agent → otherAgent
     *  - otherAgent → agent
     *
     * Garantiza que ningún valor supere 100 ni baje de 0.
     */
    applySocialInteraction(agent, otherAgent) {
        this.incrementRelationship(agent, otherAgent.id);
        this.incrementRelationship(otherAgent, agent.id);
    }
    incrementRelationship(sourceAgent, targetAgentId) {
        const rel = this.getOrCreateRelationship(sourceAgent, targetAgentId);
        rel.familiarity = (0, numberUtils_1.clamp)(rel.familiarity + FAMILIARITY_INCREMENT, 0, 100);
        rel.trust = (0, numberUtils_1.clamp)(rel.trust + TRUST_INCREMENT, 0, 100);
        rel.affinity = (0, numberUtils_1.clamp)(rel.affinity + AFFINITY_INCREMENT, 0, 100);
        rel.friendship = (0, numberUtils_1.clamp)(rel.friendship + FRIENDSHIP_INCREMENT, 0, 100);
    }
}
exports.RelationshipManager = RelationshipManager;
//# sourceMappingURL=RelationshipManager.js.map