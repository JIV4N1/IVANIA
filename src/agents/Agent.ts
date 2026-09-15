import { Personality } from './Personality';
import { AgentState } from './AgentState';
import { Relationship } from '../relationships/Relationship';
import { Memory } from '../memory/Memory';

export class Agent {
  readonly id: string;
  readonly name: string;
  personality: Personality;
  state: AgentState;
  interests: string[];
  /** Id de la ubicación donde se encuentra actualmente el agente */
  locationId: string;
  /** Relaciones que este agente mantiene con otros agentes */
  relationships: Relationship[];
  /** Colección de memorias/recuerdos almacenados por el agente */
  memories: Memory[];

  constructor(
    id: string,
    name: string,
    personality: Personality,
    state: AgentState,
    interests: string[],
    locationId: string,
    relationships: Relationship[] = [],
    memories: Memory[] = []
  ) {
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
