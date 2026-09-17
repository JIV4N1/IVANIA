import { Agent } from '../agents/Agent';
import { AgentEngine } from '../agents/AgentEngine';
import { World } from '../world/World';
import { SimulationClock } from '../simulation/SimulationClock';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { ActionExecutor } from '../simulation/ActionExecutor';
import { EventManager } from '../events/EventManager';
import { MemoryManager } from '../memory/MemoryManager';
import { RelationshipManager } from '../relationships/RelationshipManager';
/** Shared world setup for activity demos; simulation rules remain in the engines. */
export function createActivityDemoSimulation() {
  const makeAgent = (id: string, name: string) => new Agent(id, name,
    { extroversion: 80, curiosity: 70, kindness: 70, impulsivity: 50,
      sociability: 70, patience: 60, confidence: 70 },
    { energy: 80, hunger: 20, socialNeed: 65, mood: 70, isSleeping: false }, [], 'cafe');
  const world = new World('Activity demo', [
    { id: 'home', name: 'Casa', type: 'home', capabilities: ['REST'] },
    { id: 'cafe', name: 'Cafetería', type: 'cafe', capabilities: ['EAT', 'SOCIALIZE'] },
    { id: 'work', name: 'Trabajo', type: 'work', capabilities: ['WORK'] },
  ], [makeAgent('agent-ana', 'Ana'), makeAgent('agent-sofia', 'Sofía')]);
  const clock = new SimulationClock(1, 8, 0);
  const events = new EventManager(world, clock);
  const engine = new SimulationEngine(world, clock, new AgentEngine(world),
    new ActionExecutor(world, new RelationshipManager(), new MemoryManager(), events, clock), events);

  return { world, clock, events, engine };
}
