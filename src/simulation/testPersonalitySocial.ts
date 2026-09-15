import assert from 'node:assert/strict';
import { Agent } from '../agents/Agent';
import { Personality } from '../agents/Personality';
import { World } from '../world/World';
import { Location } from '../world/Location';
import { AgentEngine } from '../agents/AgentEngine';

export function runIsolatedPersonalityTests(): void {
  console.log('━'.repeat(65));
  console.log('=== PRUEBAS AISLADAS: EFECTO DE EXTROVERSIÓN EN SOCIALIZACIÓN ===');
  console.log('━'.repeat(65) + '\n');

  const locations: Location[] = [
    { id: 'loc-casa',   name: 'Casa',      type: 'home',       capabilities: ['REST'] },
    { id: 'loc-parque', name: 'Parque',    type: 'park',       capabilities: ['SOCIALIZE'] },
    { id: 'loc-cafe',   name: 'Cafetería', type: 'restaurant', capabilities: ['EAT', 'SOCIALIZE'] },
  ];

  const world = new World('Test World', locations);
  const engine = new AgentEngine(world);

  const basePersonality = (extroversion: number): Personality => ({
    extroversion, kindness: 70, curiosity: 70,
    impulsivity: 50, sociability: 70, patience: 60, confidence: 70,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Caso A — Extrovertido (extroversion = 90, socialNeed = 60)
  // ───────────────────────────────────────────────────────────────────────────
  const anaExtro = new Agent('test-ana', 'Ana', basePersonality(90),
    { energy: 80, hunger: 20, socialNeed: 60, mood: 70, isSleeping: false }, [], 'loc-parque');
  const otherAgent = new Agent('test-other', 'Compañero', basePersonality(50),
    { energy: 80, hunger: 20, socialNeed: 50, mood: 70, isSleeping: false }, [], 'loc-parque');
  world.agents = [anaExtro, otherAgent];

  const thresholdA = engine.getSocialThreshold(anaExtro);
  const decisionA = engine.decide(anaExtro, 8);

  console.log(`[Caso A — Extrovertido]`);
  console.log(`  Extroversión: 90 | Umbral calculado: ${thresholdA} | SocialNeed: 60`);
  console.log(`  Decisión: ${decisionA.intent}`);
  console.log(`  Razón   : "${decisionA.reason}"`);
  assert(decisionA.intent === 'SOCIALIZE', "Intenta socializar (SOCIALIZE)");
  console.log(`  ¿Intenta socializar (SOCIALIZE)?: ${decisionA.intent === 'SOCIALIZE' ? 'SÍ (✓)' : 'NO (✗)'}\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // Caso B — Introvertido (extroversion = 20, socialNeed = 60)
  // ───────────────────────────────────────────────────────────────────────────
  const carlosIntro = new Agent('test-carlos', 'Carlos', basePersonality(20),
    { energy: 80, hunger: 20, socialNeed: 60, mood: 70, isSleeping: false }, [], 'loc-parque');
  world.agents = [carlosIntro, otherAgent];

  const thresholdB = engine.getSocialThreshold(carlosIntro);
  const decisionB = engine.decide(carlosIntro, 8);

  console.log(`[Caso B — Introvertido (necesidad moderada)]`);
  console.log(`  Extroversión: 20 | Umbral calculado: ${thresholdB} | SocialNeed: 60`);
  console.log(`  Decisión: ${decisionB.intent}`);
  console.log(`  Razón   : "${decisionB.reason}"`);
  assert(decisionB.intent === 'IDLE', "Permanece en IDLE");
  console.log(`  ¿Permanece en IDLE?: ${decisionB.intent === 'IDLE' ? 'SÍ (✓)' : 'NO (✗)'}\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // Caso C — Introvertido con necesidad muy alta (extroversion = 20, socialNeed = 90)
  // ───────────────────────────────────────────────────────────────────────────
  const carlosHighNeed = new Agent('test-carlos-high', 'Carlos', basePersonality(20),
    { energy: 80, hunger: 20, socialNeed: 90, mood: 70, isSleeping: false }, [], 'loc-parque');
  world.agents = [carlosHighNeed, otherAgent];

  const thresholdC = engine.getSocialThreshold(carlosHighNeed);
  const decisionC = engine.decide(carlosHighNeed, 8);

  console.log(`[Caso C — Introvertido con necesidad muy alta]`);
  console.log(`  Extroversión: 20 | Umbral calculado: ${thresholdC} | SocialNeed: 90`);
  console.log(`  Decisión: ${decisionC.intent}`);
  console.log(`  Razón   : "${decisionC.reason}"`);
  assert(decisionC.intent === 'SOCIALIZE', "Intenta socializar (SOCIALIZE)");
  console.log(`  ¿Intenta socializar (SOCIALIZE)?: ${decisionC.intent === 'SOCIALIZE' ? 'SÍ (✓)' : 'NO (✗)'}\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // Caso D — Prioridad (Extrovertido con hambre >= 80 y socialNeed >= threshold)
  // ───────────────────────────────────────────────────────────────────────────
  const anaHungry = new Agent('test-ana-hungry', 'Ana', basePersonality(90),
    { energy: 80, hunger: 85, socialNeed: 65, mood: 70, isSleeping: false }, [], 'loc-cafe');
  world.agents = [anaHungry, otherAgent];

  const thresholdD = engine.getSocialThreshold(anaHungry);
  const decisionD = engine.decide(anaHungry, 8);

  console.log(`[Caso D — Regla de Prioridad (Hambre vs Socialización)]`);
  console.log(`  Extroversión: 90 | Umbral social: ${thresholdD} | SocialNeed: 65 | Hambre: 85`);
  console.log(`  Decisión: ${decisionD.intent}`);
  console.log(`  Razón   : "${decisionD.reason}"`);
  assert(decisionD.intent === 'EAT', "Prioriza comer (EAT) sobre socializar");
  console.log(`  ¿Prioriza comer (EAT) sobre socializar?: ${decisionD.intent === 'EAT' ? 'SÍ (✓)' : 'NO (✗)'}\n`);
}
