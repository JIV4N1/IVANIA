"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = void 0;
const crypto_1 = require("crypto");
const IMPORTANCE_AGENT_MOVED = 20;
const IMPORTANCE_AGENT_ATE = 20;
const IMPORTANCE_AGENT_RESTED = 20;
const IMPORTANCE_AGENTS_SOCIALIZED = 50;
const IMPORTANCE_AGENT_WENT_TO_SLEEP = 30;
const IMPORTANCE_AGENT_WOKE_UP = 30;
const IMPORTANCE_AGENT_WORKED = 20;
/**
 * Gestor responsable de construir y registrar eventos globales en el mundo.
 */
class EventManager {
    world;
    clock;
    lastWorkRecordedHourByAgent = new Map();
    constructor(world, clock) {
        this.world = world;
        this.clock = clock;
    }
    /**
     * Registra el evento de movimiento de un agente a una nueva ubicación.
     */
    recordAgentMoved(agent, destination) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'AGENT_MOVED',
            description: `${agent.name} moved to ${destination.name}.`,
            agentIds: [agent.id],
            locationId: destination.id,
            day: this.clock.getDay(),
            hour: this.clock.getHour(),
            minute: this.clock.getMinute(),
            importance: IMPORTANCE_AGENT_MOVED,
        };
        this.world.events.push(event);
        return event;
    }
    /**
     * Registra el evento de socialización entre dos agentes.
     */
    recordAgentsSocialized(initiator, target, locationName, locationId) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'AGENTS_SOCIALIZED',
            description: `${initiator.name} socialized with ${target.name} at ${locationName}.`,
            agentIds: [initiator.id, target.id],
            locationId: locationId ?? initiator.locationId,
            day: this.clock.getDay(),
            hour: this.clock.getHour(),
            minute: this.clock.getMinute(),
            importance: IMPORTANCE_AGENTS_SOCIALIZED,
        };
        this.world.events.push(event);
        return event;
    }
    /**
     * Registra el evento de un agente alimentándose.
     */
    recordAgentAte(agent, locationName, locationId) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'AGENT_ATE',
            description: `${agent.name} ate at ${locationName}.`,
            agentIds: [agent.id],
            locationId: locationId ?? agent.locationId,
            day: this.clock.getDay(),
            hour: this.clock.getHour(),
            minute: this.clock.getMinute(),
            importance: IMPORTANCE_AGENT_ATE,
        };
        this.world.events.push(event);
        return event;
    }
    /**
     * Registra el evento de un agente descansando.
     */
    recordAgentRested(agent, locationName, locationId) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'AGENT_RESTED',
            description: `${agent.name} rested at ${locationName}.`,
            agentIds: [agent.id],
            locationId: locationId ?? agent.locationId,
            day: this.clock.getDay(),
            hour: this.clock.getHour(),
            minute: this.clock.getMinute(),
            importance: IMPORTANCE_AGENT_RESTED,
        };
        this.world.events.push(event);
        return event;
    }
    /**
     * Registra cuando un agente entra en estado de sueño.
     */
    recordAgentWentToSleep(agent, locationName, locationId) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'AGENT_WENT_TO_SLEEP',
            description: `${agent.name} went to sleep at ${locationName}.`,
            agentIds: [agent.id],
            locationId: locationId ?? agent.locationId,
            day: this.clock.getDay(),
            hour: this.clock.getHour(),
            minute: this.clock.getMinute(),
            importance: IMPORTANCE_AGENT_WENT_TO_SLEEP,
        };
        this.world.events.push(event);
        return event;
    }
    /**
     * Registra cuando un agente despierta del sueño.
     */
    recordAgentWokeUp(agent, locationName, locationId) {
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'AGENT_WOKE_UP',
            description: `${agent.name} woke up at ${locationName}.`,
            agentIds: [agent.id],
            locationId: locationId ?? agent.locationId,
            day: this.clock.getDay(),
            hour: this.clock.getHour(),
            minute: this.clock.getMinute(),
            importance: IMPORTANCE_AGENT_WOKE_UP,
        };
        this.world.events.push(event);
        return event;
    }
    /**
     * Registra el evento de trabajo de un agente.
     * Limita el registro a máximo un evento por hora simulada por agente para mantener limpio el historial.
     */
    recordAgentWorked(agent, locationName, locationId) {
        const currentHour = this.clock.getHour();
        const currentDay = this.clock.getDay();
        const key = `${agent.id}-${currentDay}-${currentHour}`;
        if (this.lastWorkRecordedHourByAgent.has(key)) {
            return null;
        }
        this.lastWorkRecordedHourByAgent.set(key, currentHour);
        const event = {
            id: (0, crypto_1.randomUUID)(),
            type: 'AGENT_WORKED',
            description: `${agent.name} worked at ${locationName}.`,
            agentIds: [agent.id],
            locationId: locationId ?? agent.locationId,
            day: this.clock.getDay(),
            hour: this.clock.getHour(),
            minute: this.clock.getMinute(),
            importance: IMPORTANCE_AGENT_WORKED,
        };
        this.world.events.push(event);
        return event;
    }
    /**
     * Devuelve el historial completo de eventos del mundo.
     */
    getEvents() {
        return this.world.events;
    }
    /**
     * Devuelve todos los eventos en los que participa un agente específico.
     */
    getEventsForAgent(agentId) {
        return this.world.events.filter((event) => event.agentIds.includes(agentId));
    }
    /**
     * Devuelve los eventos ocurridos estrictamente después del momento especificado.
     */
    getEventsAfter(day, hour, minute) {
        const targetTimestamp = day * 24 * 60 + hour * 60 + minute;
        return this.world.events.filter((event) => {
            const eventTimestamp = event.day * 24 * 60 + event.hour * 60 + event.minute;
            return eventTimestamp > targetTimestamp;
        });
    }
}
exports.EventManager = EventManager;
//# sourceMappingURL=EventManager.js.map