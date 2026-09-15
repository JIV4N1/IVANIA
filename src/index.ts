import { runIsolatedPersonalityTests } from './simulation/testPersonalitySocial';
import { runIsolatedSleepTests } from './simulation/testSleepCycle';
import { runIsolatedBiologicalTests } from './simulation/testBiologicalBalance';
import { runDaySimulation } from './simulation/runSimulation';

console.log('=================================================================');
console.log('  IVANIA — FASE: BALANCE BIOLÓGICO Y RUTINAS DIURNAS/NOCTURNAS');
console.log('=================================================================\n');

// 1. Pruebas unitarias aisladas de personalidad
runIsolatedPersonalityTests();

// 2. Pruebas unitarias aisladas de ciclo de sueño
runIsolatedSleepTests();

// 3. Pruebas unitarias aisladas de balance biológico
runIsolatedBiologicalTests();

// 4. Ejecución de la simulación continua de 24 horas (288 ticks)
console.log('━'.repeat(65));
console.log('=== SIMULACIÓN CONTINUA DE 24 HORAS CON BALANCE BIOLÓGICO ===');
console.log('━'.repeat(65) + '\n');

const results = runDaySimulation();

// 5. Métricas de la ejecución actual
console.log('=== RESULTADOS OBSERVADOS ===');
for (const [type, count] of Object.entries(results.eventsByType)) {
  console.log(`${type}: ${count}`);
}
console.log(`Total de eventos: ${results.totalEvents}`);

console.log('Detalle de rutina matutina y comidas por agente:');
console.log('┌─────────┬──────────────────────┬───────────────────────────┬──────────────────┐');
console.log('│ Agente  │ Energía tras 07:00  │ Primera comida post-07:00 │ Total de comidas │');
console.log('├─────────┼──────────────────────┼───────────────────────────┼──────────────────┤');
for (const a of results.agentSummaries) {
  console.log(`│ ${a.name.padEnd(7)} │ ${a.energyAtWakeup.toFixed(1).padEnd(20)} │ ${a.firstMealAfter0700.padEnd(25)} │ ${String(a.mealsCount).padEnd(16)} │`);
}
console.log('└─────────┴──────────────────────┴───────────────────────────┴──────────────────┘');

const averageMeals = results.eventsByType.AGENT_ATE / results.agentSummaries.length;
const energies = results.agentSummaries.map((agent) => agent.energyAtWakeup);
console.log(`\nPromedio real de comidas por agente: ${averageMeals.toFixed(1)}`);
console.log(`Comidas entre 07:00 y 07:30: ${results.immediateBreakfastCount}`);
console.log(`Energía tras el tick de las 07:00: mínimo ${Math.min(...energies).toFixed(1)}, máximo ${Math.max(...energies).toFixed(1)}.`);
