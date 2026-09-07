import type { AppConfig, DefectDrillFilter, DefectListItem, LoadedData, OrgFilter, QualityMetrics } from "../types.js";
import { filterData } from "../data/data-service.js";
import { calculateCopqMetrics, costForDefect } from "../metrics/copq.js";
import {
  calculateDailyOpenClose,
  calculateDreByRelease,
  calculateOpenClosedByRelease,
  calculateReleasePhaseDre,
  calculateQualityMetrics,
  filterDefectsForDrill,
  latestRelease
} from "../metrics/quality.js";
import { calculateReleaseMilestones } from "../metrics/release-plan.js";

export function qualityResponse(
  data: LoadedData,
  config: AppConfig,
  filter: OrgFilter,
  foundInRelease?: string
): QualityMetrics {
  const scoped = filterData(data, filter);
  const allDefects = scoped.defects;
  const viewDefects = foundInRelease
    ? allDefects.filter((defect) => defect.found_in_release === foundInRelease)
    : allDefects;
  const today = new Date().toISOString().slice(0, 10);
  const metrics = calculateQualityMetrics(viewDefects, config, today);
  metrics.dreByRelease = calculateDreByRelease(allDefects, config.productionPhases);
  metrics.openClosedByRelease = calculateOpenClosedByRelease(allDefects, config.closedStatuses);
  metrics.releasePhaseDre = calculateReleasePhaseDre(
    allDefects,
    config.detectionPhases,
    config.productionPhases,
    config.closedStatuses,
    config.phaseAliases
  );
  metrics.detectionPhases = config.detectionPhases;
  const releaseMilestones = foundInRelease
    ? calculateReleaseMilestones(scoped.releasePlans, foundInRelease)
    : [];
  metrics.dailyTrend = calculateDailyOpenClose(
    viewDefects,
    config.closedStatuses,
    today,
    releaseMilestones.map((milestone) => milestone.date)
  );
  metrics.releaseMilestones = releaseMilestones;
  metrics.latestRelease = latestRelease(allDefects);
  metrics.selectedRelease = foundInRelease ?? null;
  metrics.copq = calculateCopqMetrics(viewDefects, scoped.copqRates, config, today);
  const copqAll =
    foundInRelease && scoped.copqRates.length > 0
      ? calculateCopqMetrics(allDefects, scoped.copqRates, config, today)
      : metrics.copq;
  if (metrics.copq && copqAll) {
    metrics.copq = {
      ...metrics.copq,
      byRelease: copqAll.byRelease,
      byProduct: copqAll.byProduct
    };
  }
  if (metrics.copq?.notes.length) {
    metrics.notes.push(...metrics.copq.notes);
  }
  if (foundInRelease) {
    metrics.notes.unshift(`Release filter: found_in_release = ${foundInRelease}.`);
    if (releaseMilestones.length === 0) {
      metrics.notes.push(`No release-plan milestones found for ${foundInRelease}.`);
    }
  }
  return metrics;
}

export function qualityDefectsResponse(
  data: LoadedData,
  config: AppConfig,
  filter: OrgFilter,
  drill: DefectDrillFilter
): DefectListItem[] {
  const scoped = filterData(data, filter);
  const mapped: DefectDrillFilter = {
    ...drill,
    release: drill.copqRelease ?? drill.release,
    product: drill.copqProduct ?? drill.product,
    team: drill.copqTeam ?? drill.team
  };
  const items = filterDefectsForDrill(scoped.defects, config, mapped).map((item) => {
    const estimatedCost = costForDefect(item, scoped.copqRates, config);
    return { ...item, estimatedCost };
  });
  if (drill.copq) {
    return items.filter((item) => item.estimatedCost !== null);
  }
  return items;
}
