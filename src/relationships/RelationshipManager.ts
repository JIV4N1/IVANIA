import { Agent } from '../agents/Agent';
import { Relationship } from './Relationship';

// ─── Incrementos por interacción social ───────────────────────────────────────

const FAMILIARITY_INCREMENT = 10;
const TRUST_INCREMENT       = 3;
const AFFINITY_INCREMENT    = 5;
const FRIENDSHIP_INCREMENT  = 2;

import { clamp } from '../utils/numberUtils';

export class RelationshipManager {
  /**
   * Obtiene la relación existente entre `agent` y `otherAgentId`.
   * Devuelve `undefined` si no existe una relación aún.
   */
  getRelationship(agent: Agent, otherAgentId: string): Relationship | undefined {
    return agent.relationships.find((rel) => rel.agentId === otherAgentId);
  }

  /**
   * Obtiene la relación de `agent` hacia `otherAgentId`.
   * Si no existe, la crea con valores iniciales en 0 y la agrega a `agent.relationships`.
   */
  getOrCreateRelationship(agent: Agent, otherAgentId: string): Relationship {
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
  applySocialInteraction(agent: Agent, otherAgent: Agent): void {
    this.incrementRelationship(agent, otherAgent.id);
    this.incrementRelationship(otherAgent, agent.id);
  }

  private incrementRelationship(sourceAgent: Agent, targetAgentId: string): void {
    const rel = this.getOrCreateRelationship(sourceAgent, targetAgentId);
    rel.familiarity = clamp(rel.familiarity + FAMILIARITY_INCREMENT, 0, 100);
    rel.trust       = clamp(rel.trust       + TRUST_INCREMENT,       0, 100);
    rel.affinity    = clamp(rel.affinity    + AFFINITY_INCREMENT,    0, 100);
    rel.friendship  = clamp(rel.friendship  + FRIENDSHIP_INCREMENT,  0, 100);
  }
}
