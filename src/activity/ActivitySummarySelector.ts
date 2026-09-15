import { ActivitySummaryItem } from './ActivitySummaryItem';

/** Select visible items without changing the complete formatted summary. */
export class ActivitySummarySelector {
  select(items: ActivitySummaryItem[], maxItems = 8): ActivitySummaryItem[] {
    if (!Number.isInteger(maxItems) || maxItems < 0) {
      throw new RangeError('maxItems must be a non-negative integer');
    }
    if (maxItems === 0) return [];

    const indexed = items.map((item, index) => ({ item, index }));
    if (items.length <= maxItems) return indexed.map(({ item }) => item);

    const time = (a: ActivitySummaryItem, b: ActivitySummaryItem) =>
      a.startDay - b.startDay || a.startHour - b.startHour || a.startMinute - b.startMinute;

    return indexed
      .sort((a, b) =>
        b.item.importance - a.item.importance ||
        Number(a.item.type === 'AGENT_MOVED') - Number(b.item.type === 'AGENT_MOVED') ||
        time(b.item, a.item) || a.index - b.index)
      .slice(0, maxItems)
      .sort((a, b) => time(a.item, b.item) || a.index - b.index)
      .map(({ item }) => item);
  }
}
