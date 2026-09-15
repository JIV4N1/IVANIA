"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clamp = clamp;
/**
 * Mantiene un valor numérico dentro del rango [min, max].
 */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
//# sourceMappingURL=numberUtils.js.map