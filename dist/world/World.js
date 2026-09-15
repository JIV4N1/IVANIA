"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.World = void 0;
class World {
    name;
    locations;
    agents;
    events;
    constructor(name, locations = [], agents = [], events = []) {
        this.name = name;
        this.locations = [];
        this.agents = [];
        this.events = events;
        for (const location of locations)
            this.addLocation(location);
        for (const agent of agents)
            this.addAgent(agent);
    }
    /** Agrega un agente al mundo */
    addAgent(agent) {
        if (this.getAgentById(agent.id)) {
            throw new Error(`Duplicate agent id: ${agent.id}`);
        }
        if (!this.getLocationById(agent.locationId)) {
            throw new Error(`Unknown initial location: ${agent.locationId}`);
        }
        this.agents.push(agent);
    }
    /** Agrega una ubicación al mundo */
    addLocation(location) {
        if (this.getLocationById(location.id)) {
            throw new Error(`Duplicate location id: ${location.id}`);
        }
        this.locations.push(location);
    }
    /** Devuelve la ubicación con el id dado, o undefined si no existe */
    getLocationById(id) {
        return this.locations.find((loc) => loc.id === id);
    }
    /** Devuelve el agente con el id dado, o undefined si no existe */
    getAgentById(id) {
        return this.agents.find((agent) => agent.id === id);
    }
    /** Devuelve todos los agentes cuya locationId coincide con el id dado */
    getAgentsAt(locationId) {
        return this.agents.filter((agent) => agent.locationId === locationId);
    }
    /** Alias de getAgentsAt para mayor claridad semántica */
    getAgentsAtLocation(locationId) {
        return this.getAgentsAt(locationId);
    }
}
exports.World = World;
//# sourceMappingURL=World.js.map