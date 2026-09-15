import { AgentDecision } from '../agents/AgentDecision';
import { ActionResult } from './ActionResult';

/** Agrupa decisión y resultado de acción para un agente en un tick */
export interface AgentTickResult {
  decision: AgentDecision;
  action:   ActionResult;
}
