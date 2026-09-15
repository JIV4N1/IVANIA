import { AgentIntent } from '../agents/AgentIntent';

/**
 * Resultado de ejecutar una acción sobre un agente.
 * Describe lo que ocurrió, no lo que el agente quería hacer.
 */
export interface ActionResult {
  /** Id del agente que ejecutó la acción */
  agentId: string;

  /** Intención que originó esta acción */
  intent: AgentIntent;

  /** true si la acción tuvo efecto real sobre el estado */
  success: boolean;

  /** Texto legible para depuración */
  description: string;
}
