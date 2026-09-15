import { AgentIntent } from './AgentIntent';

/**
 * Resultado de la evaluación de un agente por el AgentEngine.
 * Representa lo que el agente *quiere* hacer, no lo que *hace*.
 */
export interface AgentDecision {
  /** Intención resultante de la evaluación */
  intent: AgentIntent;

  /** Texto explicativo para depuración */
  reason: string;

  /**
   * Id de la ubicación destino. Solo relevante cuando intent === 'MOVE'.
   * Dejar vacío para cualquier otra intención.
   */
  targetLocationId?: string;

  /**
   * Id del agente objetivo. Solo relevante cuando una decisión requiere otro agente (ej. 'SOCIALIZE').
   * Dejar vacío para cualquier otra intención.
   */
  targetAgentId?: string;
}
