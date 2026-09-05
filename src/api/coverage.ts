import type { AppConfig, CoverageMetrics, LoadedData, OrgFilter } from "../types.js";
import { filterData } from "../data/data-service.js";
import { calculateCoverageMetrics } from "../metrics/coverage.js";

export function coverageResponse(
  data: LoadedData,
  _config: AppConfig,
  filter: OrgFilter,
  snapshotDate?: string
): CoverageMetrics {
  const scoped = filterData(data, filter);
  return calculateCoverageMetrics(scoped.codeCoverage, snapshotDate);
}
