import { ActivitySummaryMoment } from './ActivitySummaryPresenter';
import { compareActivitySummaryMoments, validateActivitySummaryMoment } from './activitySummaryMoment';

/** Explicit simulated-time checkpoints, scoped to this in-memory instance. */
export class LastConnectionRegistry {
  private readonly moments = new Map<string, ActivitySummaryMoment>();

  register(agentId: string, moment: ActivitySummaryMoment): void {
    const { day, hour, minute } = moment;
    validateActivitySummaryMoment(moment);
    const previous = this.moments.get(agentId);
    if (previous && compareActivitySummaryMoments(moment, previous) < 0) {
      throw new RangeError('Last connection cannot move backwards');
    }
    this.moments.set(agentId, { day, hour, minute });
  }

  get(agentId: string): ActivitySummaryMoment | undefined {
    const moment = this.moments.get(agentId);
    return moment === undefined ? undefined : { ...moment };
  }
}
