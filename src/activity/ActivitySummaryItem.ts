/** A deterministic summary; endpoints are observed event times, not inferred durations. */
export interface ActivitySummaryItem {
  type: string;
  title: string;
  description: string;
  startDay: number;
  startHour: number;
  startMinute: number;
  endDay: number;
  endHour: number;
  endMinute: number;
  eventIds: string[];
  importance: number;
}
