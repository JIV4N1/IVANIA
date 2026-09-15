import { Agent } from '../agents/Agent';
import { WorldEvent } from '../events/WorldEvent';

/** Capture before simulation: familiarity is classified from the initiator's perspective. */
export function captureKnownAgents(agents: Agent[]): Map<string, Set<string>> {
  return new Map(agents.map(agent => [agent.id, new Set(agent.relationships.map(rel => rel.agentId))]));
}

/** Replay chronological social events without changing agents or the supplied snapshot. */
export function summarizeSocialInteractions(
  agents: Agent[], events: WorldEvent[], initialKnown: ReadonlyMap<string, ReadonlySet<string>>,
) {
  const known = new Map([...initialKnown].map(([id, ids]) => [id, new Set(ids)]));
  const counts = new Map<string, { agentIds: string[]; count: number }>();
  const partners = new Map(agents.map(agent => [agent.id, new Map<string, number>()]));
  let knownInteractions = 0;
  let unknownInteractions = 0;
  for (const event of events) {
    if (event.type !== 'AGENTS_SOCIALIZED') continue;
    const [initiator, target] = event.agentIds;
    if (known.get(initiator)?.has(target)) knownInteractions++;
    else unknownInteractions++;
    const ids = [initiator, target].sort();
    const key = JSON.stringify(ids);
    const pair = counts.get(key) ?? { agentIds: ids, count: 0 };
    pair.count++;
    counts.set(key, pair);
    for (const [a, b] of [[initiator, target], [target, initiator]]) {
      const acquaintances = known.get(a) ?? new Set<string>();
      acquaintances.add(b);
      known.set(a, acquaintances);
      const peers = partners.get(a)!;
      peers.set(b, (peers.get(b) ?? 0) + 1);
    }
  }
  const name = (id: string) => agents.find(agent => agent.id === id)?.name ?? id;
  const perAgent = agents.map(agent => {
    const peers = partners.get(agent.id)!;
    const total = [...peers.values()].reduce((sum, count) => sum + count, 0);
    const max = Math.max(0, ...peers.values());
    return {
      id: agent.id, name: agent.name, interactions: total,
      relationships: agent.relationships.length,
      mostFrequentPartners: [...peers].filter(([, count]) => count === max).map(([id]) => name(id)),
      concentrationPercent: total ? max / total * 100 : 0,
    };
  });
  const maximumRelationships = Math.max(0, ...perAgent.map(agent => agent.relationships));
  return {
    total: knownInteractions + unknownInteractions, knownInteractions, unknownInteractions,
    pairs: [...counts.values()].map(pair => ({ ...pair, names: pair.agentIds.map(name) })),
    agents: perAgent,
    mostConnectedAgents: perAgent.filter(agent => agent.relationships === maximumRelationships).map(agent => agent.name),
    maximumRelationships,
  };
}

export type SocialSummary = ReturnType<typeof summarizeSocialInteractions>;
