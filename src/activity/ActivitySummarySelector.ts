import { ActivitySummaryItem } from './ActivitySummaryItem';

/** Select visible items without changing the complete formatted summary. */
export class ActivitySummarySelector {
  select(items: ActivitySummaryItem[], maxItems = 8): ActivitySummaryItem[] {
    if (!Number.isInteger(maxItems) || maxItems < 0) {
      throw new RangeError('maxItems must be a non-negative integer');
    }
    if (maxItems === 0) return [];

    const indexed = items.map((item, index) => ({ item, index }));
    const minutes = (item: ActivitySummaryItem) =>
      item.startDay * 24 * 60 + item.startHour * 60 + item.startMinute;
    if (items.length <= maxItems) return indexed
      .sort((a, b) => minutes(a.item) - minutes(b.item) || a.index - b.index)
      .map(({ item }) => item);
    const isMove = (item: ActivitySummaryItem) => Number(item.type === 'AGENT_MOVED');
    indexed.sort((a, b) =>
      b.item.importance - a.item.importance || isMove(a.item) - isMove(b.item) || a.index - b.index);

    const selected: typeof indexed = [];
    for (let start = 0; start < indexed.length && selected.length < maxItems;) {
      let end = start + 1;
      while (end < indexed.length &&
        indexed[end].item.importance === indexed[start].item.importance &&
        isMove(indexed[end].item) === isMove(indexed[start].item)) end++;
      const group = indexed.slice(start, end);
      if (group.length <= maxItems - selected.length) {
        selected.push(...group);
      } else {
        while (selected.length < maxItems) {
          group.sort((a, b) => {
            if (selected.length === 0) return minutes(a.item) - minutes(b.item) || a.index - b.index;
            const distance = (item: ActivitySummaryItem) =>
              Math.min(...selected.map(chosen => Math.abs(minutes(item) - minutes(chosen.item))));
            return distance(b.item) - distance(a.item) ||
              minutes(a.item) - minutes(b.item) || a.index - b.index;
          });
          selected.push(group.shift()!);
        }
      }
      start = end;
    }
    return selected
      .sort((a, b) => minutes(a.item) - minutes(b.item) || a.index - b.index)
      .map(({ item }) => item);
  }
}
