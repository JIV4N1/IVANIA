import { ActivitySummaryMoment } from './ActivitySummaryPresenter';

export function validateActivitySummaryMoment({ day, hour, minute }: ActivitySummaryMoment): void {
  if (!Number.isSafeInteger(day) || day < 1 ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(minute) || minute < 0 || minute > 55 || minute % 5 !== 0) {
    throw new RangeError('Expected day >= 1, hour 0-23 and minute 0-55 in multiples of 5');
  }
}

export function compareActivitySummaryMoments(a: ActivitySummaryMoment, b: ActivitySummaryMoment): number {
  return a.day - b.day || a.hour - b.hour || a.minute - b.minute;
}
