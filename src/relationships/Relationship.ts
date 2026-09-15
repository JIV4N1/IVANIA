/**
 * Representa la relación que un agente tiene respecto a otro agente.
 */
export interface Relationship {
  /** Id del otro agente en la relación */
  agentId: string;

  /** Nivel de familiaridad (0-100) */
  familiarity: number;

  /** Nivel de confianza (0-100) */
  trust: number;

  /** Nivel de afinidad (0-100) */
  affinity: number;

  /** Nivel de amistad (0-100) */
  friendship: number;
}
