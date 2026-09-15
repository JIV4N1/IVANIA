export interface AgentState {
  /** Nivel de energía disponible (0–100) */
  energy: number;

  /** Nivel de hambre del agente (0–100) */
  hunger: number;

  /** Necesidad de interacción social no satisfecha (0–100) */
  socialNeed: number;

  /** Estado emocional general (0–100) */
  mood: number;

  /** Indica si el agente se encuentra actualmente durmiendo */
  isSleeping: boolean;
}
