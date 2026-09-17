import { EventManager } from '../events/EventManager';
import { WorldEvent } from '../events/WorldEvent';
import { ActivitySummary } from './ActivitySummary';

import { ActivitySummaryFormatter } from './ActivitySummaryFormatter';
import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummarySelection, ActivitySummarySelector } from './ActivitySummarySelector';
import { ActivitySummaryMoment } from './ActivitySummaryPresenter';
import { compareActivitySummaryMoments, validateActivitySummaryMoment } from './activitySummaryMoment';

const IMPORTANT_EVENT_THRESHOLD = 40;

export class ActivitySummaryService {
  constructor(private readonly eventManager: EventManager) {}

  /** Return events strictly after from, optionally through to (inclusive), before any grouping. */
  getSummaryForAgent(
    agentId: string, fromDay: number, fromHour: number, fromMinute: number,
    to?: ActivitySummaryMoment,
  ): ActivitySummary {
    if (to !== undefined) {
      const from = { day: fromDay, hour: fromHour, minute: fromMinute };
      validateActivitySummaryMoment(from);
      validateActivitySummaryMoment(to);
      if (compareActivitySummaryMoments(to, from) < 0) {
        throw new RangeError('Summary cutoff cannot precede last connection');
      }
    }
    const events = this.eventManager.getEventsAfter(fromDay, fromHour, fromMinute)
      .filter(event => event.agentIds.includes(agentId) &&
        (to === undefined || compareActivitySummaryMoments(event, to) <= 0))
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
    selection: ActivitySummarySelection = 'important',
  ): ActivitySummaryItem[] {
    return new ActivitySummarySelector().select(
      this.getFormattedSummaryForAgent(agentId, fromDay, fromHour, fromMinute), maxItems, selection,
    );
  }

  getImportantEvents(
    agentId: string, fromDay: number, fromHour: number, fromMinute: number,
  ): WorldEvent[] {
    return this.getSummaryForAgent(agentId, fromDay, fromHour, fromMinute).events
      .filter(event => event.importance >= IMPORTANT_EVENT_THRESHOLD);
  }
}
