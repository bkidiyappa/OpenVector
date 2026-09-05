import type {
  AppConfig,
  DailyOpenClosePoint,
  DefectDrillFilter,
  DefectListItem,
  DefectRow,
  QualityMetrics,
  ReleaseDailyTrend,
  ReleaseDre,
  ReleaseOpenClosed,
  ReleasePhaseDre,
  SeverityGroup
} from "../types.js";
import { calculateTrend } from "./trends.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function daysBetween(start: string, end: string): number {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

export function isClosedStatus(status: string, closedStatuses: string[]): boolean {
  return closedStatuses.some((value) => value.toLowerCase() === status.toLowerCase());
}

export function normalizePhase(phase: string, aliases: Record<string, string>): string {
  return aliases[phase] ?? phase;
}

export function isProductionPhase(phase: string, productionPhases: string[]): boolean {
  return productionPhases.some((value) => value.toLowerCase() === phase.toLowerCase());
}

export function calculateDefectLeakage(defects: DefectRow[], productionPhases: string[]): number | null {
  if (defects.length === 0) {
    return null;
  }
  const production = defects.filter((defect) => isProductionPhase(defect.detection_phase, productionPhases)).length;
  return (production / defects.length) * 100;
}

export function calculateDefectRemovalEfficiency(defects: DefectRow[], productionPhases: string[]): number | null {
  if (defects.length === 0) {
    return null;
  }
  const leaked = defects.filter((defect) => isProductionPhase(defect.detection_phase, productionPhases)).length;
  return ((defects.length - leaked) / defects.length) * 100;
}

function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function sortReleases(defects: DefectRow[]): string[] {
  const firstSeen = new Map<string, string>();
  for (const defect of defects) {
    const current = firstSeen.get(defect.found_in_release);
    if (!current || defect.created_date < current) {
      firstSeen.set(defect.found_in_release, defect.created_date);
    }
  }
  return [...firstSeen.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))
    .map(([release]) => release);
}

export function calculateDreByRelease(defects: DefectRow[], productionPhases: string[]): ReleaseDre[] {
  return sortReleases(defects).map((release) => {
    const rows = defects.filter((defect) => defect.found_in_release === release);
    const leaked = rows.filter((defect) => isProductionPhase(defect.detection_phase, productionPhases)).length;
    return {
      release,
      dre: calculateDefectRemovalEfficiency(rows, productionPhases),
      removed: rows.length - leaked,
      leaked,
      total: rows.length
    };
  });
}

export function calculateReleasePhaseDre(
  defects: DefectRow[],
  phases: string[],
  productionPhases: string[],
  closedStatuses: string[],
  aliases: Record<string, string>
): ReleasePhaseDre[] {
  return sortReleases(defects).map((release) => {
    const rows = defects.filter((defect) => defect.found_in_release === release);
    const leaked = rows.filter((defect) => isProductionPhase(defect.detection_phase, productionPhases)).length;
    const closed = rows.filter((defect) => isClosedStatus(defect.status, closedStatuses)).length;
    const counts = Object.fromEntries(phases.map((phase) => [phase, 0]));
    for (const defect of rows) {
      const phase = normalizePhase(defect.detection_phase, aliases);
      if (phase in counts) {
        counts[phase] += 1;
      }
    }
    return {
      release,
      dre: calculateDefectRemovalEfficiency(rows, productionPhases),
      open: rows.length - closed,
      closed,
      counts
    };
  });
}

export function calculateOpenClosedByRelease(defects: DefectRow[], closedStatuses: string[]): ReleaseOpenClosed[] {
  return sortReleases(defects).map((release) => {
    const rows = defects.filter((defect) => defect.found_in_release === release);
    const closed = rows.filter((defect) => isClosedStatus(defect.status, closedStatuses)).length;
    return {
      release,
      open: rows.length - closed,
      closed,
      total: rows.length
    };
  });
}

export function calculateDailyOpenClose(
  defects: DefectRow[],
  closedStatuses: string[],
  today: string,
  extraDates: string[] = []
): DailyOpenClosePoint[] {
  if (defects.length === 0 && extraDates.length === 0) {
    return [];
  }

  const openedOn = new Map<string, number>();
  const closedOn = new Map<string, number>();
  const dates = [
    ...defects.map((defect) => defect.created_date),
    ...defects.map((defect) => defect.resolved_date).filter((value): value is string => Boolean(value)),
    ...extraDates
  ];
  let start = dates.reduce((min, date) => (date < min ? date : min));
  let end = today;
  for (const date of extraDates) {
    if (date > end) {
      end = date;
    }
  }
  if (extraDates.length > 0) {
    start = addDays(start, -5);
  }

  for (const defect of defects) {
    openedOn.set(defect.created_date, (openedOn.get(defect.created_date) ?? 0) + 1);
    if (defect.resolved_date && isClosedStatus(defect.status, closedStatuses)) {
      closedOn.set(defect.resolved_date, (closedOn.get(defect.resolved_date) ?? 0) + 1);
    }
  }

  const days: DailyOpenClosePoint[] = [];
  let backlog = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const opened = openedOn.get(date) ?? 0;
    const closed = closedOn.get(date) ?? 0;
    backlog += opened - closed;
    days.push({ date, opened, closed, openBacklog: Math.max(0, backlog) });
  }
  return days;
}

export function calculateDailyTrends(
  defects: DefectRow[],
  closedStatuses: string[],
  today: string
): ReleaseDailyTrend[] {
  return sortReleases(defects).map((release) => ({
    release,
    days: calculateDailyOpenClose(
      defects.filter((defect) => defect.found_in_release === release),
      closedStatuses,
      today
    )
  }));
}

export function mapSeverity(severity: string, config: AppConfig["severity"]): SeverityGroup {
  const normalized = severity.toLowerCase();
  for (const group of ["critical", "high", "medium", "low"] as const) {
    if (config[group].some((value) => value.toLowerCase() === normalized)) {
      return group;
    }
  }
  return "unmapped";
}

export function calculateDefectAgeDays(
  defect: DefectRow,
  today: string,
  closedStatuses: string[]
): number {
  if (isClosedStatus(defect.status, closedStatuses) && defect.resolved_date) {
    return daysBetween(defect.created_date, defect.resolved_date);
  }
  return daysBetween(defect.created_date, today);
}

export function bucketAge(age: number, buckets: AppConfig["ageBuckets"]): string {
  const match = buckets.find((bucket) => age >= bucket.min && (bucket.max === null || age <= bucket.max));
  return match?.label ?? ">90 days";
}

export function latestRelease(defects: DefectRow[]): string | null {
  if (defects.length === 0) {
    return null;
  }
  return [...defects].sort((a, b) => b.created_date.localeCompare(a.created_date) || b.id.localeCompare(a.id))[0]
    .found_in_release;
}

export function calculateQualityMetrics(
  defects: DefectRow[],
  config: AppConfig,
  today = new Date().toISOString().slice(0, 10)
): QualityMetrics {
  const notes: string[] = [];
  if (defects.length === 0) {
    notes.push("No defect data available. Quality metrics are not fabricated.");
  }

  const release = latestRelease(defects);
  const defectLeakage = calculateDefectLeakage(defects, config.productionPhases);
  const openDefects = defects.filter((defect) => !isClosedStatus(defect.status, config.closedStatuses)).length;
  const customerDefects = defects.filter((defect) => defect.customer_reported).length;

  const severityOrder: SeverityGroup[] = ["critical", "high", "medium", "low", "unmapped"];
  const severityCounts = new Map<SeverityGroup, number>(severityOrder.map((key) => [key, 0]));
  for (const defect of defects) {
    const group = mapSeverity(defect.severity, config.severity);
    severityCounts.set(group, (severityCounts.get(group) ?? 0) + 1);
  }
  const bySeverity = severityOrder
    .filter((key) => key !== "unmapped" || (severityCounts.get(key) ?? 0) > 0)
    .map((key) => ({
      key,
      label: key === "unmapped" ? "Unmapped" : key.charAt(0).toUpperCase() + key.slice(1),
      count: severityCounts.get(key) ?? 0
    }));

  const phaseCounts = new Map<string, number>(config.detectionPhases.map((phase) => [phase, 0]));
  for (const defect of defects) {
    const phase = normalizePhase(defect.detection_phase, config.phaseAliases);
    if (!phaseCounts.has(phase)) {
      continue;
    }
    phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
  }
  const byPhase = config.detectionPhases.map((phase) => ({
    phase,
    count: phaseCounts.get(phase) ?? 0
  }));

  const ageCounts = new Map(config.ageBuckets.map((bucket) => [bucket.label, 0]));
  for (const defect of defects) {
    const age = calculateDefectAgeDays(defect, today, config.closedStatuses);
    const bucket = bucketAge(age, config.ageBuckets);
    ageCounts.set(bucket, (ageCounts.get(bucket) ?? 0) + 1);
  }
  const byAge = config.ageBuckets.map((bucket) => ({
    bucket: bucket.label,
    count: ageCounts.get(bucket.label) ?? 0
  }));

  const internalVsExternal = [
    { key: "internal" as const, count: defects.filter((defect) => !defect.customer_reported).length },
    { key: "external" as const, count: customerDefects }
  ];

  const previousRelease = [...new Set(defects.map((defect) => defect.found_in_release))]
    .filter((value) => value !== release)
    .sort((a, b) => {
      const aDate = defects.filter((defect) => defect.found_in_release === a).reduce((max, row) => (row.created_date > max ? row.created_date : max), "");
      const bDate = defects.filter((defect) => defect.found_in_release === b).reduce((max, row) => (row.created_date > max ? row.created_date : max), "");
      return aDate.localeCompare(bDate);
    })
    .at(-1);
  const previousLeakage = previousRelease
    ? calculateDefectLeakage(
        defects.filter((defect) => defect.found_in_release === previousRelease),
        config.productionPhases
      )
    : null;

  const statusCounts = new Map<string, number>();
  for (const defect of defects) {
    statusCounts.set(defect.status, (statusCounts.get(defect.status) ?? 0) + 1);
  }
  const byStatus = [...statusCounts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));

  return {
    defectLeakage,
    openDefects,
    customerDefects,
    totalDefects: defects.length,
    latestRelease: release,
    selectedRelease: null,
    dreByRelease: calculateDreByRelease(defects, config.productionPhases),
    openClosedByRelease: calculateOpenClosedByRelease(defects, config.closedStatuses),
    releasePhaseDre: calculateReleasePhaseDre(
      defects,
      config.detectionPhases,
      config.productionPhases,
      config.closedStatuses,
      config.phaseAliases
    ),
    detectionPhases: config.detectionPhases,
    dailyTrend: calculateDailyOpenClose(defects, config.closedStatuses, today),
    dailyTrends: calculateDailyTrends(defects, config.closedStatuses, today),
    releaseMilestones: [],
    byStatus,
    bySeverity,
    byPhase,
    byAge,
    internalVsExternal,
    notes,
    trends: {
      defectLeakage: calculateTrend(previousLeakage, defectLeakage, "lower"),
      openDefects: null,
      customerDefects: null
    }
  };
}

export function filterDefectsForDrill(
  defects: DefectRow[],
  config: AppConfig,
  drill: DefectDrillFilter,
  today = new Date().toISOString().slice(0, 10)
): DefectListItem[] {
  return defects
    .filter((defect) => {
      const phase = normalizePhase(defect.detection_phase, config.phaseAliases);
      const group = mapSeverity(defect.severity, config.severity);
      const age = calculateDefectAgeDays(defect, today, config.closedStatuses);
      const closed = isClosedStatus(defect.status, config.closedStatuses);

      if (drill.severity && group !== drill.severity) {
        return false;
      }
      if (drill.phase && phase !== drill.phase) {
        return false;
      }
      if (drill.origin === "external" && !defect.customer_reported) {
        return false;
      }
      if (drill.origin === "internal" && defect.customer_reported) {
        return false;
      }
      if (drill.ageBucket && bucketAge(age, config.ageBuckets) !== drill.ageBucket) {
        return false;
      }
      if (drill.status === "open" && closed) {
        return false;
      }
      if (drill.status === "closed" && !closed) {
        return false;
      }
      if (drill.release && defect.found_in_release !== drill.release) {
        return false;
      }
      if (drill.statusName && defect.status !== drill.statusName) {
        return false;
      }
      if (drill.productionOnly && !isProductionPhase(phase, config.productionPhases)) {
        return false;
      }
      return true;
    })
    .map((defect) => {
      const ageDays = calculateDefectAgeDays(defect, today, config.closedStatuses);
      return {
        id: defect.id,
        organization: defect.organization,
        vertical: defect.vertical,
        product: defect.product,
        team: defect.team,
        title: defect.title,
        severity: defect.severity,
        severityGroup: mapSeverity(defect.severity, config.severity),
        created_date: defect.created_date,
        resolved_date: defect.resolved_date,
        detection_phase: normalizePhase(defect.detection_phase, config.phaseAliases),
        customer_reported: defect.customer_reported,
        found_in_release: defect.found_in_release,
        scheduled_for_release: defect.scheduled_for_release,
        status: defect.status,
        ageDays,
        ageBucket: bucketAge(ageDays, config.ageBuckets)
      };
    })
    .sort((a, b) => b.created_date.localeCompare(a.created_date) || a.id.localeCompare(b.id));
}

export function calculateTeamDefectLeakage(
  defects: DefectRow[],
  productionPhases: string[]
): { organization: string; vertical: string; product: string; team: string; value: number | null }[] {
  const groups = new Map<string, DefectRow[]>();
  for (const defect of defects) {
    const key = `${defect.organization}::${defect.vertical}::${defect.product}::${defect.team}`;
    const list = groups.get(key) ?? [];
    list.push(defect);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, rows]) => {
    const [organization, vertical, product, team] = key.split("::");
    return {
      organization,
      vertical,
      product,
      team,
      value: calculateDefectLeakage(rows, productionPhases)
    };
  });
}
