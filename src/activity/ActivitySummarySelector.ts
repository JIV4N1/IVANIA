import { ActivitySummaryItem } from './ActivitySummaryItem';

export type ActivitySummarySelection = 'important' | 'balanced';
export const activityCategories = ['SOCIAL', 'SLEEP', 'WORK', 'EAT', 'REST', 'MOVE'] as const;
export type ActivityCategory = typeof activityCategories[number];

export function activityCategory(item: ActivitySummaryItem): ActivityCategory | undefined {
  switch (item.type) {
    case 'AGENTS_SOCIALIZED': return 'SOCIAL';
    case 'AGENT_WENT_TO_SLEEP':
    case 'AGENT_WOKE_UP': return 'SLEEP';
    case 'AGENT_WORKED': return 'WORK';
    case 'AGENT_ATE': return 'EAT';
    case 'AGENT_RESTED': return 'REST';
    case 'AGENT_MOVED': return 'MOVE';
  }
}

/** Select visible items without changing the complete formatted summary. */
export class ActivitySummarySelector {
  select(items: ActivitySummaryItem[], maxItems = 8,
    selection: ActivitySummarySelection = 'important'): ActivitySummaryItem[] {
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
    const byCoverage = (a: typeof indexed[number], b: typeof indexed[number]) => {
      const chronological = minutes(a.item) - minutes(b.item) || a.index - b.index;
      if (selected.length === 0) return chronological;
      const distance = (item: ActivitySummaryItem) =>
        Math.min(...selected.map(chosen => Math.abs(minutes(item) - minutes(chosen.item))));
      return distance(b.item) - distance(a.item) || chronological;
    };
    if (selection === 'balanced') {
      const categories = activityCategories.filter(category => category !== 'MOVE')
        .map((category, priority) => ({ priority,
          candidates: indexed.filter(entry => activityCategory(entry.item) === category) }))
        .filter(category => category.candidates.length > 0)
        .sort((a, b) => b.candidates[0].item.importance - a.candidates[0].item.importance ||
          a.priority - b.priority);
      for (const { candidates } of categories) {
        if (selected.length === maxItems) break;
        const highest = candidates.filter(entry => entry.item.importance === candidates[0].item.importance);
        selected.push(highest.sort(byCoverage)[0]);
      }
    }
    const reserved = new Set(selected.map(entry => entry.index));
    for (let start = 0; start < indexed.length && selected.length < maxItems;) {
      let end = start + 1;
      while (end < indexed.length &&
        indexed[end].item.importance === indexed[start].item.importance &&
        isMove(indexed[end].item) === isMove(indexed[start].item)) end++;
      const group = indexed.slice(start, end).filter(entry => !reserved.has(entry.index));
      if (group.length <= maxItems - selected.length) {
        selected.push(...group);
      } else {
        while (selected.length < maxItems) {
          group.sort(byCoverage);
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
