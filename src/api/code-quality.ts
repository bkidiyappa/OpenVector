import type { AppConfig, CodeQualityMetrics, LoadedData, OrgFilter } from "../types.js";
import { filterData } from "../data/data-service.js";
import { calculateCodeQualityMetrics } from "../metrics/code-quality.js";

export function codeQualityResponse(
  data: LoadedData,
  config: AppConfig,
  filter: OrgFilter,
  snapshotDate?: string
): CodeQualityMetrics {
  const scoped = filterData(data, filter);
  return calculateCodeQualityMetrics(scoped.codeQuality, config.codeQuality.weights, snapshotDate);
}
