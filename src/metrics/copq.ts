import type {
  AppConfig,
  CopqDailyPoint,
  CopqMetrics,
  CopqPhaseBucket,
  CopqProductBucket,
  CopqRateRow,
  CopqReleaseBucket,
  CopqStackRow,
  CopqTeamBucket,
  DefectRow,
  SeverityGroup
} from "../types.js";
import { latestRelease, mapSeverity, normalizePhase, parseIsoDate, sortReleases } from "./quality.js";
import { calculateTrend } from "./trends.js";

const SEVERITY_ORDER: SeverityGroup[] = ["critical", "high", "medium", "low", "unmapped"];

export function mapCopqSeverity(severity: string, config: AppConfig["severity"]): SeverityGroup {
  const mapped = mapSeverity(severity, config);
  if (mapped !== "unmapped") {
    return mapped;
  }
  const group = severity.trim().toLowerCase();
  if (group === "critical" || group === "high" || group === "medium" || group === "low") {
    return group;
  }
  return "unmapped";
}

export function buildCopqRateMap(rates: CopqRateRow[], config: AppConfig): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rates) {
    const phase = normalizePhase(row.detection_phase, config.phaseAliases);
    const group = mapCopqSeverity(row.severity, config.severity);
    if (group === "unmapped") {
      continue;
    }
    map.set(rateKey(phase, group), row.unit_cost);
  }
  return map;
}

export function rateKey(phase: string, severityGroup: string): string {
  return `${phase}::${severityGroup}`;
}

export function costForDefect(
  defect: Pick<DefectRow, "detection_phase" | "severity">,
  rates: CopqRateRow[] | Map<string, number>,
  config: AppConfig
): number | null {
  const map = rates instanceof Map ? rates : buildCopqRateMap(rates, config);
  const phase = normalizePhase(defect.detection_phase, config.phaseAliases);
  const group = mapCopqSeverity(defect.severity, config.severity);
  const cost = map.get(rateKey(phase, group));
  return cost === undefined ? null : cost;
}

function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function severityLabel(key: SeverityGroup): string {
  return key === "unmapped" ? "Unmapped" : key.charAt(0).toUpperCase() + key.slice(1);
}

type PricedDefect = { defect: DefectRow; cost: number; phase: string; group: SeverityGroup };

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function phaseBuckets(rows: PricedDefect[], phases: string[]): CopqPhaseBucket[] {
  const totals = new Map<string, { cost: number; count: number }>(
    phases.map((phase) => [phase, { cost: 0, count: 0 }])
  );
  for (const row of rows) {
    const current = totals.get(row.phase) ?? { cost: 0, count: 0 };
    current.cost += row.cost;
    current.count += 1;
    totals.set(row.phase, current);
  }
  const ordered = phases.map((phase) => ({
    phase,
    cost: totals.get(phase)?.cost ?? 0,
    count: totals.get(phase)?.count ?? 0
  }));
  for (const [phase, bucket] of totals) {
    if (!phases.includes(phase)) {
      ordered.push({ phase, ...bucket });
    }
  }
  return ordered;
}

function stackRow(key: string, label: string, rows: PricedDefect[], phases: string[]): CopqStackRow {
  return {
    key,
    label,
    cost: rows.reduce((sum, row) => sum + row.cost, 0),
    count: rows.length,
    byPhase: phaseBuckets(rows, phases)
  };
}

function teamBuckets(rows: PricedDefect[], product: string, phases: string[]): CopqTeamBucket[] {
  return uniqueSorted(rows.map((row) => row.defect.team)).map((team) => {
    const teamRows = rows.filter((row) => row.defect.team === team);
    return {
      ...stackRow(team, team, teamRows, phases),
      product,
      team
    };
  });
}

function productBucket(rows: PricedDefect[], product: string, phases: string[], releases: string[]): CopqProductBucket {
  const first = rows[0]?.defect;
  return {
    ...stackRow(product, product, rows, phases),
    product,
    organization: first?.organization ?? "",
    vertical: first?.vertical ?? "",
    teams: teamBuckets(rows, product, phases),
    byRelease: releases
      .map((release) => {
        const releaseRows = rows.filter((row) => row.defect.found_in_release === release);
        return stackRow(release, release, releaseRows, phases);
      })
      .filter((row) => row.count > 0)
  };
}

function releaseBuckets(priced: PricedDefect[], defects: DefectRow[], phases: string[]): CopqReleaseBucket[] {
  const releases = sortReleases(defects);
  return releases.map((release) => {
    const rows = priced.filter((row) => row.defect.found_in_release === release);
    const products = uniqueSorted(rows.map((row) => row.defect.product)).map((product) => {
      const productRows = rows.filter((row) => row.defect.product === product);
      const first = productRows[0]?.defect;
      return {
        ...stackRow(product, product, productRows, phases),
        product,
        organization: first?.organization ?? "",
        vertical: first?.vertical ?? "",
        teams: teamBuckets(productRows, product, phases),
        byRelease: []
      };
    });
    return {
      ...stackRow(release, release, rows, phases),
      release,
      products
    };
  });
}

function previousRelease(defects: DefectRow[], current: string | null): string | null {
  if (!current) {
    return null;
  }
  return (
    [...new Set(defects.map((defect) => defect.found_in_release))]
      .filter((value) => value !== current)
      .sort((a, b) => {
        const aDate = defects
          .filter((defect) => defect.found_in_release === a)
          .reduce((max, row) => (row.created_date > max ? row.created_date : max), "");
        const bDate = defects
          .filter((defect) => defect.found_in_release === b)
          .reduce((max, row) => (row.created_date > max ? row.created_date : max), "");
        return aDate.localeCompare(bDate);
      })
      .at(-1) ?? null
  );
}

function sumCost(defects: DefectRow[], rates: Map<string, number>, config: AppConfig): number {
  return defects.reduce((total, defect) => total + (costForDefect(defect, rates, config) ?? 0), 0);
}

export function calculateCopqMetrics(
  defects: DefectRow[],
  rates: CopqRateRow[],
  config: AppConfig,
  today = new Date().toISOString().slice(0, 10)
): CopqMetrics | null {
  if (rates.length === 0) {
    return null;
  }

  const rateMap = buildCopqRateMap(rates, config);
  const notes: string[] = [];
  const priced: { defect: DefectRow; cost: number; phase: string; group: SeverityGroup }[] = [];
  let omittedCount = 0;

  for (const defect of defects) {
    const cost = costForDefect(defect, rateMap, config);
    if (cost === null) {
      omittedCount += 1;
      continue;
    }
    priced.push({
      defect,
      cost,
      phase: normalizePhase(defect.detection_phase, config.phaseAliases),
      group: mapCopqSeverity(defect.severity, config.severity)
    });
  }

  if (omittedCount > 0) {
    notes.push(
      `${omittedCount} defect${omittedCount === 1 ? "" : "s"} ${
        omittedCount === 1 ? "has" : "have"
      } no matching COPQ rate and ${omittedCount === 1 ? "was" : "were"} omitted from cost.`
    );
  }

  const total = priced.reduce((sum, row) => sum + row.cost, 0);

  const phaseOrder = [...config.detectionPhases];
  const phaseTotals = new Map<string, { cost: number; count: number }>(
    phaseOrder.map((phase) => [phase, { cost: 0, count: 0 }])
  );
  const severityTotals = new Map<SeverityGroup, { cost: number; count: number }>(
    SEVERITY_ORDER.map((key) => [key, { cost: 0, count: 0 }])
  );

  for (const row of priced) {
    const phaseEntry = phaseTotals.get(row.phase) ?? { cost: 0, count: 0 };
    phaseEntry.cost += row.cost;
    phaseEntry.count += 1;
    if (!phaseTotals.has(row.phase)) {
      phaseOrder.push(row.phase);
    }
    phaseTotals.set(row.phase, phaseEntry);

    const severityEntry = severityTotals.get(row.group) ?? { cost: 0, count: 0 };
    severityEntry.cost += row.cost;
    severityEntry.count += 1;
    severityTotals.set(row.group, severityEntry);
  }

  const byPhase = phaseOrder.map((phase) => ({
    phase,
    cost: phaseTotals.get(phase)?.cost ?? 0,
    count: phaseTotals.get(phase)?.count ?? 0
  }));

  const bySeverity = SEVERITY_ORDER.filter(
    (key) => key !== "unmapped" || (severityTotals.get(key)?.count ?? 0) > 0
  ).map((key) => ({
    key,
    label: severityLabel(key),
    cost: severityTotals.get(key)?.cost ?? 0,
    count: severityTotals.get(key)?.count ?? 0
  }));

  const byRelease = releaseBuckets(priced, defects, config.detectionPhases);
  const byProduct = uniqueSorted(priced.map((row) => row.defect.product)).map((product) =>
    productBucket(
      priced.filter((row) => row.defect.product === product),
      product,
      config.detectionPhases,
      sortReleases(defects)
    )
  );

  let dailyTrend: CopqDailyPoint[] = [];
  if (defects.length > 0) {
    const start = defects.reduce(
      (min, defect) => (defect.created_date < min ? defect.created_date : min),
      defects[0].created_date
    );
    const costByDate = new Map<string, PricedDefect[]>();
    for (const row of priced) {
      const date = row.defect.created_date;
      const list = costByDate.get(date) ?? [];
      list.push(row);
      costByDate.set(date, list);
    }
    for (let date = start; date <= today; date = addDays(date, 1)) {
      const rows = costByDate.get(date) ?? [];
      dailyTrend.push({
        date,
        cost: rows.reduce((sum, row) => sum + row.cost, 0),
        count: rows.length,
        byPhase: phaseBuckets(rows, config.detectionPhases)
      });
    }
  }

  const release = latestRelease(defects);
  const prior = previousRelease(defects, release);
  const currentReleaseCost = release
    ? sumCost(
        defects.filter((defect) => defect.found_in_release === release),
        rateMap,
        config
      )
    : null;
  const previousReleaseCost = prior
    ? sumCost(
        defects.filter((defect) => defect.found_in_release === prior),
        rateMap,
        config
      )
    : null;

  return {
    total,
    currency: config.copq.currency,
    pricedCount: priced.length,
    omittedCount,
    byPhase,
    bySeverity,
    byRelease,
    byProduct,
    dailyTrend,
    notes,
    trend: calculateTrend(previousReleaseCost, currentReleaseCost, "lower")
  };
}
