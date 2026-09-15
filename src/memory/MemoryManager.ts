import { randomUUID } from 'crypto';
import { Agent } from '../agents/Agent';
import { Memory } from './Memory';
import { SimulationClock } from '../simulation/SimulationClock';

const SOCIAL_INTERACTION_IMPORTANCE = 40;

export class MemoryManager {
  /**
   * Registra una interacción social entre dos agentes.
   * Crea dos objetos Memory independientes con sus propios IDs y descripciones,
   * y los almacena en `agent.memories` y `otherAgent.memories` respectivamente.
   */
  recordSocialInteraction(
    initiator: Agent,
    target: Agent,
    locationName: string,
    clock: SimulationClock
  ): [Memory, Memory] {
    const memoryInitiator: Memory = {
      id: randomUUID(),
      type: 'SOCIAL_INTERACTION',
      description: `${initiator.name} socialized with ${target.name} at ${locationName}.`,
      involvedAgentIds: [target.id],
      locationId: initiator.locationId,
      day: clock.getDay(),
      hour: clock.getHour(),
      minute: clock.getMinute(),
      importance: SOCIAL_INTERACTION_IMPORTANCE,
    };

    const memoryTarget: Memory = {
      id: randomUUID(),
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
  getMemories(agent: Agent): Memory[] {
    return agent.memories;
  }

  /**
   * Devuelve las memorias de un agente que involucran a `otherAgentId`.
   */
  getMemoriesInvolving(agent: Agent, otherAgentId: string): Memory[] {
    return agent.memories.filter((m) => m.involvedAgentIds.includes(otherAgentId));
  }
}
