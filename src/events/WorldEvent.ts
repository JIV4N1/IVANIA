import { WorldEventType } from './WorldEventType';

/**
 * Representa un acontecimiento global relevante ocurrido en el mundo de IVANIA.
 */
export interface WorldEvent {
  /** Identificador único del evento */
  id: string;

  /** Tipo de evento del mundo */
  type: WorldEventType;

  /** Descripción conceptual del evento */
  description: string;

  /** IDs de los agentes involucrados en el evento */
  agentIds: string[];

  /** ID de la ubicación donde ocurrió o destino del evento */
  locationId?: string;

  /** Día simulado en que ocurrió el evento */
  day: number;

  /** Hora simulada (0-23) */
  hour: number;

  /** Minuto simulado (0-59) */
  minute: number;

  /** Nivel de importancia (0-100) */
  importance: number;
}
