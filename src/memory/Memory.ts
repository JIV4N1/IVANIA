import { MemoryType } from './MemoryType';

/**
 * Representa un recuerdo o memoria almacenada por un agente.
 */
export interface Memory {
  /** Identificador único del recuerdo */
  id: string;

  /** Tipo de memoria */
  type: MemoryType;

  /** Descripción conceptual del recuerdo */
  description: string;

  /** IDs de los agentes involucrados en la experiencia */
  involvedAgentIds: string[];

  /** ID de la ubicación donde ocurrió el evento */
  locationId: string;

  /** Día simulado en que ocurrió el evento */
  day: number;

  /** Hora simulada (0-23) */
  hour: number;

  /** Minuto simulado (0-59) */
  minute: number;

  /** Nivel de importancia (0-100) */
  importance: number;
}
