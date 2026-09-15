import { Agent } from './Agent';
import { AgentDecision } from './AgentDecision';
import { AgentIntent } from './AgentIntent';
import { LocationCapability } from '../world/LocationCapability';
import { World } from '../world/World';
import { Location } from '../world/Location';
import { clamp } from '../utils/numberUtils';

// ─── Umbrales de decisión ─────────────────────────────────────────────────────

const HUNGER_THRESHOLD = 80;
const ENERGY_THRESHOLD = 20;

/** Global work schedule: 09:00 inclusive, 17:00 exclusive. */
export function isWorkingHour(hour: number): boolean {
  return hour >= 9 && hour < 17;
}

// ─── Motor de decisión ────────────────────────────────────────────────────────

/**
 * Observa el estado de un agente y el entorno (World) para devolver una decisión.
 *
 * Responsabilidades:
 *  - Evaluar AgentState según reglas de prioridad (EAT -> REST -> WORK -> SOCIALIZE -> IDLE).
 *  - Calcular el umbral de socialización de forma personalizada y determinista según extroversion.
 *  - Consultar la ubicación actual del agente.
 *  - Si la necesidad puede satisfacerse aquí → devolver la acción directa.
 *  - Si no puede → buscar una ubicación compatible y devolver MOVE.
 *  - Si no existe ninguna compatible → devolver IDLE con razón explicativa.
 *
 * NO modifica al agente, NO modifica el mundo, NO ejecuta acciones.
 */
export class AgentEngine {
  private readonly world: World;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Evalúa el agente y devuelve su decisión.
   * Las reglas se evalúan en orden estricto de prioridad:
   * 1. Hambre (EAT)
   * 2. Energía (REST)
   * 3. Trabajo durante 09:00-17:00, si el agente no duerme.
   * 4. Necesidad social con umbral por extroversión (SOCIALIZE)
   * 5. Inactividad (IDLE)
   */
  decide(agent: Agent, hour: number): AgentDecision {
    const { hunger, energy, socialNeed } = agent.state;

    if (hunger >= HUNGER_THRESHOLD) {
      return this.resolveNeed(
        agent,
        'EAT',
        hunger,
        `Hunger is above ${HUNGER_THRESHOLD} (${hunger})`
      );
    }

    if (energy <= ENERGY_THRESHOLD) {
      return this.resolveNeed(
        agent,
        'REST',
        energy,
        `Energy is below or equal to ${ENERGY_THRESHOLD} (${energy})`
      );
    }

    if (!agent.state.isSleeping && isWorkingHour(hour) &&
        this.world.locations.some((location) => location.capabilities.includes('WORK'))) {
      return this.resolveNeed(agent, 'WORK', 0, 'Working hours (09:00-17:00)');
    }

    const socialThreshold = this.getSocialThreshold(agent);
    if (socialNeed >= socialThreshold) {
      return this.resolveNeed(
        agent,
        'SOCIALIZE',
        socialNeed,
        `Social need ${socialNeed} reached threshold ${socialThreshold} based on extroversion ${agent.personality.extroversion}`
      );
    }

    return { intent: 'IDLE', reason: 'No urgent need detected' };
  }

  /**
   * Calcula el umbral de necesidad social según el nivel de extroversión de la personalidad.
   * Fórmula lineal: threshold = 90 - (extroversion × 0.4)
   *  - Extroversión 0   → threshold 90
   *  - Extroversión 25  → threshold 80
   *  - Extroversión 50  → threshold 70
   *  - Extroversión 75  → threshold 60
   *  - Extroversión 100 → threshold 50
   */
  getSocialThreshold(agent: Agent): number {
    const rawThreshold = 90 - agent.personality.extroversion * 0.4;
    return clamp(rawThreshold, 50, 90);
  }

  // ─── Resolución contextual ────────────────────────────────────────────────

  /**
   * Determina si la necesidad puede satisfacerse en la ubicación actual.
   * Si no, busca una ubicación compatible en el mundo y devuelve MOVE.
   * Si no existe ninguna, devuelve IDLE.
   */
  private resolveNeed(
    agent: Agent,
    intent: AgentIntent,
    _value: number,
    baseReason: string
  ): AgentDecision {
    const capability = intent as LocationCapability;
    const currentLocation = this.world.getLocationById(agent.locationId);

    // ¿La ubicación actual soporta esta actividad?
    if (currentLocation && this.supportsCapability(currentLocation, capability)) {
      if (intent === 'SOCIALIZE') {
        const nearbyAgents = this.world.getAgentsAtLocation(agent.locationId);
        let target: Agent | undefined;
        let bestScore = -Infinity;
        for (const candidate of nearbyAgents) {
          if (candidate.id === agent.id || candidate.state.isSleeping) continue;
          const score = this.getSocialScore(agent, candidate);
          // Strict comparison preserves the existing order on ties.
          if (score > bestScore) {
            target = candidate;
            bestScore = score;
          }
        }

        if (target) {
          const known = agent.relationships.some(relationship => relationship.agentId === target.id);
          return {
            intent: 'SOCIALIZE',
            targetAgentId: target.id,
            reason: `${agent.name} chose ${target.name} for socializing with score ${bestScore} based on ${known ? 'existing relationship (known)' : 'curiosity (unknown)'}.`,
          };
        }

        return {
          intent: 'IDLE',
          reason: `${agent.name} wants to socialize (${baseReason}), but no valid awake candidates are present at "${currentLocation.name}".`,
        };
      }

      return { intent, reason: baseReason };
    }

    // Buscar la primera ubicación del mundo que soporte la actividad
    const destination = this.world.locations.find(
      (loc) => loc.id !== agent.locationId && this.supportsCapability(loc, capability)
    );

    if (destination) {
      const currentName = currentLocation?.name ?? agent.locationId;
      return {
        intent: 'MOVE',
        reason: `${agent.name} needs to ${intent.toLowerCase()} (${baseReason}) but "${currentName}" does not support ${capability}; moving to "${destination.name}".`,
        targetLocationId: destination.id,
      };
    }

    // No hay ninguna ubicación compatible en el mundo
    return {
      intent: 'IDLE',
      reason: `${agent.name} needs to ${intent.toLowerCase()} (${baseReason}) but no location in the world supports ${capability}.`,
    };
  }

  // ─── Utilidad ─────────────────────────────────────────────────────────────

  private getSocialScore(agent: Agent, candidate: Agent): number {
    const relationship = agent.relationships.find(item => item.agentId === candidate.id);
    if (!relationship) return agent.personality.curiosity * 0.30;
    return relationship.familiarity * 0.25 + relationship.trust * 0.20 +
      relationship.affinity * 0.35 + relationship.friendship * 0.20;
  }

  private supportsCapability(location: Location, capability: LocationCapability): boolean {
    return location.capabilities.includes(capability);
  }
}
