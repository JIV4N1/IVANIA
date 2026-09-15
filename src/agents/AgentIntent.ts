/**
 * Intenciones posibles de un agente.
 * Se usa string literal union en lugar de enum para mejor compatibilidad
 * con serialización JSON y legibilidad en consola.
 */
export type AgentIntent = 'EAT' | 'REST' | 'SOCIALIZE' | 'IDLE' | 'MOVE' | 'WORK';
