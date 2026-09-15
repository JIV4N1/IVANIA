import { EventManager } from '../events/EventManager';
import { WorldEvent } from '../events/WorldEvent';
import { ActivitySummary } from './ActivitySummary';

import { ActivitySummaryFormatter } from './ActivitySummaryFormatter';
import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummarySelector } from './ActivitySummarySelector';

const IMPORTANT_EVENT_THRESHOLD = 40;

export class ActivitySummaryService {
  constructor(private readonly eventManager: EventManager) {}

  /** Return events strictly after the cutoff; ties retain their history order. */
  getSummaryForAgent(
    agentId: string, fromDay: number, fromHour: number, fromMinute: number,
  ): ActivitySummary {
    const events = this.eventManager.getEventsAfter(fromDay, fromHour, fromMinute)
      .filter(event => event.agentIds.includes(agentId))
      .sort((a, b) => a.day - b.day || a.hour - b.hour || a.minute - b.minute)
      // Detach returned events so callers cannot accidentally edit the history.
      .map(event => ({ ...event, agentIds: [...event.agentIds] }));
    return {
      agentId, fromDay, fromHour, fromMinute, events,
      totalEvents: events.length,
      importantEvents: events.filter(event => event.importance >= IMPORTANT_EVENT_THRESHOLD).length,
    };
  }

  getFormattedSummaryForAgent(
    agentId: string, fromDay: number, fromHour: number, fromMinute: number,
  ): ActivitySummaryItem[] {
    return new ActivitySummaryFormatter().format(
      this.getSummaryForAgent(agentId, fromDay, fromHour, fromMinute).events, agentId,
    );
  }

  getBriefSummaryForAgent(
    agentId: string, fromDay: number, fromHour: number, fromMinute: number, maxItems = 8,
  ): ActivitySummaryItem[] {
    return new ActivitySummarySelector().select(
      this.getFormattedSummaryForAgent(agentId, fromDay, fromHour, fromMinute), maxItems,
    );
  }

  getImportantEvents(
    agentId: string, fromDay: number, fromHour: number, fromMinute: number,
  ): WorldEvent[] {
    return this.getSummaryForAgent(agentId, fromDay, fromHour, fromMinute).events
      .filter(event => event.importance >= IMPORTANT_EVENT_THRESHOLD);
  }
}
