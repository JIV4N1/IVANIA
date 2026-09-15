"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationClock = void 0;
/** Minutos simulados que avanza cada llamada a tick() */
const MINUTES_PER_TICK = 5;
/** Total de minutos en un día simulado (24 h × 60 min) */
const MINUTES_PER_DAY = 24 * 60;
class SimulationClock {
    day;
    hour;
    minute;
    /**
     * @param day    Día inicial (por defecto 1)
     * @param hour   Hora inicial en formato 0–23 (por defecto 8)
     * @param minute Minuto inicial en múltiplo de 5 (por defecto 0)
     */
    constructor(day = 1, hour = 8, minute = 0) {
        this.day = day;
        this.hour = hour;
        this.minute = minute;
    }
    /**
     * Avanza exactamente MINUTES_PER_TICK minutos simulados.
     * Maneja el cambio de hora y el cambio de día automáticamente.
     */
    tick() {
        // Convertimos todo a minutos dentro del día, sumamos y descomponemos
        const totalMinutes = this.hour * 60 + this.minute + MINUTES_PER_TICK;
        this.day += Math.floor(totalMinutes / MINUTES_PER_DAY);
        this.hour = Math.floor((totalMinutes % MINUTES_PER_DAY) / 60);
        this.minute = totalMinutes % 60;
    }
    /** Día simulado actual */
    getDay() {
        return this.day;
    }
    /** Hora actual (0–23) */
    getHour() {
        return this.hour;
    }
    /** Minuto actual (0–55, múltiplos de 5) */
    getMinute() {
        return this.minute;
    }
    /**
     * Tiempo actual formateado.
     * Ejemplo: "Día 1 - 08:05"
     */
    getFormattedTime() {
        const hh = String(this.hour).padStart(2, '0');
        const mm = String(this.minute).padStart(2, '0');
        return `Día ${this.day} - ${hh}:${mm}`;
    }
}
exports.SimulationClock = SimulationClock;
//# sourceMappingURL=SimulationClock.js.map