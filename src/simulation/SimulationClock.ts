/** Minutos simulados que avanza cada llamada a tick() */
export const MINUTES_PER_TICK = 5;

/** Total de minutos en un día simulado (24 h × 60 min) */
const MINUTES_PER_DAY = 24 * 60;

export class SimulationClock {
  private day: number;
  private hour: number;
  private minute: number;

  /**
   * @param day    Día inicial (por defecto 1)
   * @param hour   Hora inicial en formato 0–23 (por defecto 8)
   * @param minute Minuto inicial en múltiplo de 5 (por defecto 0)
   */
  constructor(day: number = 1, hour: number = 8, minute: number = 0) {
    this.day    = day;
    this.hour   = hour;
    this.minute = minute;
  }

  /**
   * Avanza exactamente MINUTES_PER_TICK minutos simulados.
   * Maneja el cambio de hora y el cambio de día automáticamente.
   */
  tick(): void {
    // Convertimos todo a minutos dentro del día, sumamos y descomponemos
    const totalMinutes = this.hour * 60 + this.minute + MINUTES_PER_TICK;

    this.day    += Math.floor(totalMinutes / MINUTES_PER_DAY);
    this.hour    = Math.floor((totalMinutes % MINUTES_PER_DAY) / 60);
    this.minute  = totalMinutes % 60;
  }

  /** Día simulado actual */
  getDay(): number {
    return this.day;
  }

  /** Hora actual (0–23) */
  getHour(): number {
    return this.hour;
  }

  /** Minuto actual (0–55, múltiplos de 5) */
  getMinute(): number {
    return this.minute;
  }

  /**
   * Tiempo actual formateado.
   * Ejemplo: "Día 1 - 08:05"
   */
  getFormattedTime(): string {
    const hh = String(this.hour).padStart(2, '0');
    const mm = String(this.minute).padStart(2, '0');
    return `Día ${this.day} - ${hh}:${mm}`;
  }
}
