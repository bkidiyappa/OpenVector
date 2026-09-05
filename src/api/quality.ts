import type { AppConfig, DefectDrillFilter, DefectListItem, LoadedData, OrgFilter, QualityMetrics } from "../types.js";
import { filterData } from "../data/data-service.js";
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
  return filterDefectsForDrill(scoped.defects, config, drill);
}
