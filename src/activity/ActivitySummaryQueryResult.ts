import { ActivitySummaryItem } from './ActivitySummaryItem';
import { ActivitySummaryMoment } from './ActivitySummaryPresenter';
import { ActivitySummarySelection } from './ActivitySummarySelector';

/** Detached result for the simulated interval (from, to]. */
export interface ActivitySummaryQueryResult {
  agentId: string;
  from: ActivitySummaryMoment;
  to: ActivitySummaryMoment;
  completeItems: ActivitySummaryItem[];
  selectedItems: ActivitySummaryItem[];
  totalEvents: number;
  totalItems: number;
  selectedCount: number;
  omittedCount: number;
  maxItems: number;
  selectionPolicy: ActivitySummarySelection;
}
