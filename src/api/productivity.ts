import type { AppConfig, LoadedData, OrgFilter, ProductivityMetrics, SprintTeamBreakdown } from "../types.js";
import { filterData } from "../data/data-service.js";
import { breakdownSprintByTeam, calculateProductivityMetrics } from "../metrics/productivity.js";

export function productivityResponse(
  data: LoadedData,
  config: AppConfig,
  filter: OrgFilter
): ProductivityMetrics {
  const scoped = filterData(data, filter);
  return calculateProductivityMetrics(scoped.sprints, config.metrics.velocityMovingAverage);
}

export function productivityBreakdownResponse(
  data: LoadedData,
  filter: OrgFilter,
  sprint: string,
  endDate?: string
): SprintTeamBreakdown[] {
  const scoped = filterData(data, filter);
  return breakdownSprintByTeam(scoped.sprints, sprint, endDate);
}
