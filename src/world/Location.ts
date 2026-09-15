import { LocationCapability } from './LocationCapability';

export interface Location {
  /** Identificador único de la ubicación */
  id: string;

  /** Nombre legible de la ubicación */
  name: string;

  /**
   * Categoría general del lugar.
   * Ejemplos: 'home', 'park', 'shop', 'work', 'cafe'
   */
  type: string;

  /** Actividades que se pueden realizar en esta ubicación */
  capabilities: LocationCapability[];
}
