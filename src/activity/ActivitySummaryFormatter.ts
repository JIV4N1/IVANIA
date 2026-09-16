import { WorldEvent } from '../events/WorldEvent';
import { ActivitySummaryItem } from './ActivitySummaryItem';

const labels: Record<WorldEvent['type'], string> = {
  AGENT_WORKED: 'Trabajo', AGENT_MOVED: 'Movimiento', AGENT_ATE: 'Comida',
  AGENT_RESTED: 'Descanso', AGENTS_SOCIALIZED: 'Interacción social',
  AGENT_WENT_TO_SLEEP: 'Sueño', AGENT_WOKE_UP: 'Despertar',
};

/** Pure formatting of already filtered events. No world/history changes or new scores. */
export class ActivitySummaryFormatter {
  format(events: readonly WorldEvent[], agentId?: string): ActivitySummaryItem[] {
    const ordered = [...events].sort((a, b) =>
      a.day - b.day || a.hour - b.hour || a.minute - b.minute);
    const usefulMoves = this.selectUsefulMoves(ordered);
    const items: ActivitySummaryItem[] = [];
    const sleeping = new Map<string, ActivitySummaryItem>();
    const worked = new Set<string>();
    let previous: WorldEvent | undefined;
    let previousItem: ActivitySummaryItem | undefined;

    for (const event of ordered) {
      if (event.type === 'AGENT_MOVED' && !usefulMoves.has(event)) {
        // Hidden movements still interrupt the original WORK sequence.
        previous = event;
        previousItem = undefined;
        continue;
      }
      const actor = event.agentIds[0];
      if (event.type === 'AGENT_WORKED' && actor !== undefined &&
          previous?.type === 'AGENT_WORKED' && previous.agentIds[0] === actor &&
          previousItem) {
        this.extend(previousItem, event);
        previousItem.description = this.workDescription(previousItem, false);
        // Preserve the return-to-work wording for subsequent blocks.
        if (previousItem.title === 'Regreso al trabajo') {
          previousItem.description = 'Regresaste al trabajo.';
        }
      } else if (event.type === 'AGENT_WOKE_UP' && actor !== undefined && sleeping.has(actor)) {
        const item = sleeping.get(actor)!;
        this.extend(item, event);
        item.description = this.atLocation('Dormiste', ordered.find(e => e.id === item.eventIds[0])!);
        sleeping.delete(actor);
        previousItem = item;
      } else {
        const item: ActivitySummaryItem = {
          type: event.type, title: labels[event.type],
          description: this.describe(event, agentId),
          startDay: event.day, startHour: event.hour, startMinute: event.minute,
          endDay: event.day, endHour: event.hour, endMinute: event.minute,
          eventIds: [event.id], importance: event.importance,
        };
        if (event.type === 'AGENT_WORKED') {
          const returning = actor !== undefined && worked.has(actor);
          item.title = returning ? 'Regreso al trabajo' : 'Trabajo';
          item.description = this.workDescription(item, returning);
          if (actor !== undefined) worked.add(actor);
        }
        if (event.type === 'AGENT_WENT_TO_SLEEP' && actor !== undefined) sleeping.set(actor, item);
        items.push(item);
        previousItem = item;
      }
      previous = event;
    }
    // Items stay in start-time order, including sleep intervals spanning midnight.
    return items;
  }


  /**
   * Keep only the final leg before the next activity of that agent, at the same
   * known location. A wake-up is a boundary, not evidence of an arrival.
   * Unknown/mismatched destinations and unfinished chains are omitted.
   * References (not IDs) distinguish events without changing the input.
   */
  private selectUsefulMoves(ordered: readonly WorldEvent[]): Set<WorldEvent> {
    const pending = new Map<string, WorldEvent>();
    const useful = new Set<WorldEvent>();
    const relevant = new Set<WorldEvent['type']>([
      'AGENT_ATE', 'AGENT_RESTED', 'AGENT_WORKED',
      'AGENT_WENT_TO_SLEEP', 'AGENTS_SOCIALIZED',
    ]);
    for (const event of ordered) {
      if (event.type === 'AGENT_MOVED') {
        const actor = event.agentIds[0];
        if (actor !== undefined) pending.set(actor, event);
        continue;
      }
      for (const actor of event.agentIds) {
        const move = pending.get(actor);
        if (move && relevant.has(event.type) && move.locationId !== undefined &&
            move.locationId === event.locationId) {
          useful.add(move);
        }
        // Never skip an intervening activity to find a more convenient match.
        pending.delete(actor);
      }
    }
    return useful;
  }

  private extend(item: ActivitySummaryItem, event: WorldEvent): void {
    item.endDay = event.day;
    item.endHour = event.hour;
    item.endMinute = event.minute;
    item.eventIds.push(event.id);
    item.importance = Math.max(item.importance, event.importance);
  }

  private workDescription(item: ActivitySummaryItem, returning: boolean): string {
    if (returning) return 'Regresaste al trabajo.';
    if (item.startDay === item.endDay && item.startHour >= 6 && item.endHour < 13) {
      return 'Trabajaste durante la mañana.';
    }
    if (item.startDay === item.endDay && item.startHour >= 12 && item.endHour < 20) {
      return 'Trabajaste durante la tarde.';
    }
    return 'Trabajaste.';
  }

  /** Names currently live in EventManager's fixed English descriptions.
   * Fall back to the structured location ID if a description has another format.
   */
  private atLocation(action: string, event: WorldEvent): string {
    const location = event.description.match(event.type === 'AGENT_MOVED' ? / moved to (.+)\.$/ : / at (.+)\.$/)?.[1] ?? event.locationId;
    const preposition = event.type === 'AGENT_MOVED' ? 'a' : 'en';
    return location ? `${action} ${preposition} ${location}.` : `${action}.`;
  }

  private describe(event: WorldEvent, agentId?: string): string {
    switch (event.type) {
      case 'AGENT_WORKED': return 'Trabajaste.';
      case 'AGENT_MOVED': return this.atLocation('Te desplazaste', event);
      case 'AGENT_ATE': return this.atLocation('Comiste', event);
      case 'AGENT_RESTED': return this.atLocation('Descansaste', event);
      case 'AGENT_WENT_TO_SLEEP': return this.atLocation('Te dormiste', event);
      case 'AGENT_WOKE_UP': return this.atLocation('Despertaste', event);
      case 'AGENTS_SOCIALIZED': {
        const isInitiator = agentId !== undefined && agentId === event.agentIds[0];
        const isTarget = agentId !== undefined && agentId === event.agentIds[1];
        if (!isInitiator && !isTarget) {
          return this.atLocation('Se registró una interacción social', event);
        }
        const names = event.description.match(/^(.+) socialized with (.+) at (.+)\.$/);
        const partnerIndex = isInitiator ? 1 : 0;
        const partner = names?.[partnerIndex + 1] || event.agentIds[partnerIndex];
        if (!partner) return this.atLocation('Se registró una interacción social', event);
        return this.atLocation(isInitiator
          ? `Iniciaste una conversación con ${partner}`
          : `${partner} inició una conversación contigo`, event);
      }
    }
  }
}
