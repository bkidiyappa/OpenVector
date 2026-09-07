import type { AppConfig, LoadedData, OrgFilter, OverviewMetrics } from "../types.js";
import { maturityResponse } from "./maturity.js";
import { productivityResponse } from "./productivity.js";
import { qualityResponse } from "./quality.js";

export function overviewResponse(data: LoadedData, config: AppConfig, filter: OrgFilter): OverviewMetrics {
  const productivity = productivityResponse(data, config, filter);
  const quality = qualityResponse(data, config, filter);
  const maturity = maturityResponse(data, config, filter);

  return {
    maturity: {
      overall: maturity.overall,
      band: maturity.band,
      trend: maturity.trend
    },
    productivity: {
      velocity: productivity.latest.velocity,
      storyPointsPerCapacityDay: productivity.latest.storyPointsPerCapacityDay,
      trends: productivity.trends
    },
    quality: {
      defectLeakage: quality.defectLeakage,
      openDefects: quality.openDefects,
      customerDefects: quality.customerDefects,
      copq: quality.copq
        ? { total: quality.copq.total, currency: quality.copq.currency, trend: quality.copq.trend }
        : null,
      trends: quality.trends
    },
    notes: [...productivity.notes, ...quality.notes, ...maturity.notes].filter(
      (note) => note !== "No release filter. Charts use the full defect set."
    )
  };
}
