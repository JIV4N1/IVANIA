"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
class Agent {
    id;
    name;
    personality;
    state;
    interests;
    /** Id de la ubicación donde se encuentra actualmente el agente */
    locationId;
    /** Relaciones que este agente mantiene con otros agentes */
    relationships;
    /** Colección de memorias/recuerdos almacenados por el agente */
    memories;
    constructor(id, name, personality, state, interests, locationId, relationships = [], memories = []) {
        this.id = id;
        this.name = name;
        this.personality = personality;
        this.state = state;
        this.interests = interests;
        this.locationId = locationId;
        this.relationships = relationships;
        this.memories = memories;
    }
}
exports.Agent = Agent;
//# sourceMappingURL=Agent.js.map