export interface Personality {
  /** Tendencia a buscar estimulación social (0–100) */
  extroversion: number;

  /** Disposición a ser amable y cooperativo (0–100) */
  kindness: number;

  /** Deseo de explorar y aprender cosas nuevas (0–100) */
  curiosity: number;

  /** Tendencia a actuar sin reflexión previa (0–100) */
  impulsivity: number;

  /** Necesidad de interactuar con otros agentes (0–100) */
  sociability: number;

  /** Capacidad de tolerar esperas o frustraciones (0–100) */
  patience: number;

  /** Nivel de seguridad en sí mismo (0–100) */
  confidence: number;
}
