import { WorldEvent } from '../events/WorldEvent';

export interface ActivitySummary {
  agentId: string;
  fromDay: number;
  fromHour: number;
  fromMinute: number;
  events: WorldEvent[];
  totalEvents: number;
  importantEvents: number;
}
