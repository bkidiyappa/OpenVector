import type { AppConfig, LoadedData, MaturityMetrics, MaturityTeamBreakdown, OrgFilter } from "../types.js";
import { filterData } from "../data/data-service.js";
import { calculateMaturityTeamBreakdown, calculateQualityMaturity } from "../metrics/maturity.js";
import { calculateQualityMetrics } from "../metrics/quality.js";

export function maturityResponse(data: LoadedData, config: AppConfig, filter: OrgFilter): MaturityMetrics {
  const scoped = filterData(data, filter);
  const quality = calculateQualityMetrics(scoped.defects, config);
  return calculateQualityMaturity(scoped.automation, scoped.codeCoverage, scoped.codeQuality, quality, config);
}

export function maturityBreakdownResponse(
  data: LoadedData,
  config: AppConfig,
  filter: OrgFilter,
  component: string
): MaturityTeamBreakdown[] {
  const scoped = filterData(data, filter);
  return calculateMaturityTeamBreakdown(
    component,
    scoped.automation,
    scoped.codeCoverage,
    scoped.codeQuality,
    scoped.defects,
    config
  );
}
