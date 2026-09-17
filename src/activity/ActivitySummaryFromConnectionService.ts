import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummarySelection, ActivitySummarySelector } from './ActivitySummarySelector';
import { ActivitySummaryFormatter } from './ActivitySummaryFormatter';
import { ActivitySummaryMoment } from './ActivitySummaryPresenter';
import { ActivitySummaryQueryResult } from './ActivitySummaryQueryResult';
import { ActivitySummaryService } from './ActivitySummaryService';
import { LastConnectionRegistry } from './LastConnectionRegistry';

/** Read summaries from an explicit checkpoint; queries never acknowledge a return. */
export class ActivitySummaryFromConnectionService {
  constructor(
    private readonly connections: LastConnectionRegistry,
    private readonly summaries: ActivitySummaryService,
  ) {}

  getSummaryAt(agentId: string, to: ActivitySummaryMoment, maxItems = 8,
    selectionPolicy: ActivitySummarySelection = 'important'): ActivitySummaryQueryResult | undefined {
    const from = this.connections.get(agentId);
    if (from === undefined) return undefined;
    const cutoff = { ...to };
    if (selectionPolicy !== 'important' && selectionPolicy !== 'balanced') {
      throw new RangeError(`Selección desconocida: "${selectionPolicy}". Usa important o balanced.`);
    }
    const summary = this.summaries.getSummaryForAgent(agentId, from.day, from.hour, from.minute, cutoff);
    const completeItems = new ActivitySummaryFormatter().format(summary.events, agentId);
    const selectedItems = new ActivitySummarySelector().select(completeItems, maxItems, selectionPolicy);
    return {
      agentId, from, to: cutoff, completeItems, selectedItems,
      totalEvents: summary.totalEvents, totalItems: completeItems.length,
      selectedCount: selectedItems.length, omittedCount: completeItems.length - selectedItems.length,
      maxItems, selectionPolicy,
    };
  }

  getFormattedSummaryForAgent(agentId: string): ActivitySummaryItem[] | undefined {
    const from = this.connections.get(agentId);
    if (from === undefined) return undefined;
    return this.summaries.getFormattedSummaryForAgent(agentId, from.day, from.hour, from.minute);
  }

  getBriefSummaryForAgent(agentId: string, maxItems = 8,
    selection: ActivitySummarySelection = 'important'): ActivitySummaryItem[] | undefined {
    const from = this.connections.get(agentId);
    if (from === undefined) return undefined;
    return this.summaries.getBriefSummaryForAgent(agentId, from.day, from.hour, from.minute, maxItems, selection);
  }
}
