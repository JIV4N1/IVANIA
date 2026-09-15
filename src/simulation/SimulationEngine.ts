import { World } from '../world/World';
import { SimulationClock } from './SimulationClock';
import { AgentState } from '../agents/AgentState';
import { AgentEngine } from '../agents/AgentEngine';
import { ActionExecutor } from './ActionExecutor';
import { AgentTickResult } from './AgentTickResult';
import { EventManager } from '../events/EventManager';
import { AgentDecision } from '../agents/AgentDecision';
import { clamp } from '../utils/numberUtils';

// ─── Deltas por tick (5 minutos simulados) durante el día ────────────────────

const HUNGER_PER_TICK      =  0.75;
const ENERGY_PER_TICK      = -0.5;
const SOCIAL_NEED_PER_TICK =  1;

// ─── Deltas por tick (5 minutos simulados) durante el sueño nocturno ─────────

const SLEEP_ENERGY_RECOVERY =  1.5;
const SLEEP_HUNGER_INCREASE =  0.2;
const SLEEP_SOCIAL_INCREASE =  0.15;

// ─── Horario global de sueño ──────────────────────────────────────────────────

const SLEEP_START_HOUR = 23; // 23:00
const SLEEP_END_HOUR   = 7;  // 07:00

// ─── Motor de simulación ──────────────────────────────────────────────────────

export class SimulationEngine {
  private readonly world:          World;
  private readonly clock:          SimulationClock;
  private readonly agentEngine:    AgentEngine;
  private readonly actionExecutor: ActionExecutor;
  private readonly eventManager:   EventManager;

  constructor(
    world:          World,
    clock:          SimulationClock,
    agentEngine:    AgentEngine,
    actionExecutor: ActionExecutor,
    eventManager:   EventManager,
  ) {
    this.world          = world;
    this.clock          = clock;
    this.agentEngine    = agentEngine;
    this.actionExecutor = actionExecutor;
    this.eventManager   = eventManager;
  }

  /**
   * Advance once, prepare all biological states, then collect all decisions.
   * Execute only after collection, in the existing agent order, without replanning.
   * Sleep transitions are prepared with biology and their events emitted at execution.
   */
  tick(): Map<string, AgentTickResult> {
    this.clock.tick();
    const hour = this.clock.getHour();
    const isNightTime = hour >= SLEEP_START_HOUR || hour < SLEEP_END_HOUR;
    const decisions = new Map<string, AgentDecision>();
    const transitions = new Map<string, 'sleep' | 'wake'>();
    const sleepDescriptions = new Map<string, string>();
    const results = new Map<string, AgentTickResult>();

    // Phase 1a: finish every agent's own biological update before anyone perceives.
    // No action, movement, relationship, memory or event changes happen here.
    for (const agent of this.world.agents) {
      const location = this.world.getLocationById(agent.locationId);
      if (isNightTime && (agent.state.isSleeping || location?.capabilities.includes('REST'))) {
        const enteringSleep = !agent.state.isSleeping;
        if (enteringSleep) transitions.set(agent.id, 'sleep');
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
      } else {
        if (!isNightTime && agent.state.isSleeping) {
          transitions.set(agent.id, 'wake');
          agent.state = { ...agent.state, isSleeping: false };
        }
        agent.state = this.applyAwakeDelta(agent.state);
      }
    }

    // Phase 1b: the shared world stays unchanged throughout normal decisions.
    for (const agent of this.world.agents) {
      if (decisions.has(agent.id)) continue; // Sleeping agents do not decide normally.
      const restDestination = isNightTime
        ? this.world.locations.find(location => location.capabilities.includes('REST'))
        : undefined;
      const decision: AgentDecision = restDestination && restDestination.id !== agent.locationId
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
      const decision = decisions.get(agent.id)!;
      const transition = transitions.get(agent.id);
      const locationName = this.world.getLocationById(agent.locationId)?.name ?? agent.locationId;
      if (transition === 'sleep') {
        this.eventManager.recordAgentWentToSleep(agent, locationName, agent.locationId);
      } else if (transition === 'wake') {
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
  private applySleepDelta(state: AgentState): AgentState {
    return {
      energy:     clamp(state.energy     + SLEEP_ENERGY_RECOVERY, 0, 100),
      hunger:     clamp(state.hunger     + SLEEP_HUNGER_INCREASE, 0, 100),
      socialNeed: clamp(state.socialNeed + SLEEP_SOCIAL_INCREASE, 0, 100),
      mood:       state.mood,
      isSleeping: true,
    };
  }

  /** Aplica los deltas diurnos normales por tick */
  private applyAwakeDelta(state: AgentState): AgentState {
    return {
      hunger:     clamp(state.hunger     + HUNGER_PER_TICK,      0, 100),
      energy:     clamp(state.energy     + ENERGY_PER_TICK,       0, 100),
      socialNeed: clamp(state.socialNeed + SOCIAL_NEED_PER_TICK,  0, 100),
      mood:       state.mood,
      isSleeping: state.isSleeping,
    };
  }
}
