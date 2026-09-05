import type { AppConfig, CodeQualityBreakdown, CodeQualityMetrics, CodeQualityRow, CodeQualitySnapshot } from "../types.js";

export type CodeQualityWeights = AppConfig["codeQuality"]["weights"];

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function weightedQualityScore(
  maintainability: number | null,
  security: number | null,
  vulnerability: number | null,
  weights: CodeQualityWeights
): number | null {
  const parts = [
    { value: maintainability, weight: weights.maintainability },
    { value: security, weight: weights.security },
    { value: vulnerability, weight: weights.vulnerability }
  ].filter((part): part is { value: number; weight: number } => part.value !== null && part.weight > 0);

  const weightTotal = parts.reduce((sum, part) => sum + part.weight, 0);
  if (parts.length === 0 || weightTotal <= 0) {
    return null;
  }

  return parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weightTotal;
}

function moduleKey(row: Pick<CodeQualityRow, "organization" | "vertical" | "product" | "module">): string {
  return `${row.organization}::${row.vertical}::${row.product}::${row.module}`;
}

export function latestQualityByModule(rows: CodeQualityRow[]): CodeQualityRow[] {
  const latest = new Map<string, CodeQualityRow>();
  for (const row of rows) {
    const key = moduleKey(row);
    const current = latest.get(key);
    if (!current || row.date > current.date) {
      latest.set(key, row);
    }
  }
  return [...latest.values()];
}

function snapshotFromRows(rows: CodeQualityRow[], date: string | null, weights: CodeQualityWeights): CodeQualitySnapshot {
  const maintainability = average(rows.map((row) => row.maintainability));
  const security = average(rows.map((row) => row.security));
  const vulnerability = average(rows.map((row) => row.vulnerability));
  return {
    date,
    maintainability,
    security,
    vulnerability,
    score: weightedQualityScore(maintainability, security, vulnerability, weights)
  };
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function breakdownFromRows(
  rows: CodeQualityRow[],
  groupBy: "product" | "module",
  weights: CodeQualityWeights
): CodeQualityBreakdown[] {
  if (groupBy === "product") {
    const products = uniqueSorted(rows.map((row) => row.product));
    return products
      .map((product) => {
        const scoped = rows.filter((row) => row.product === product);
        const first = scoped[0];
        return {
          ...snapshotFromRows(scoped, first?.date ?? null, weights),
          organization: first?.organization ?? "",
          vertical: first?.vertical ?? "",
          product,
          module: "",
          label: product,
          level: "product" as const
        };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  return latestQualityByModule(rows)
    .map((row) => ({
      ...snapshotFromRows([row], row.date, weights),
      organization: row.organization,
      vertical: row.vertical,
      product: row.product,
      module: row.module,
      label: row.module,
      level: "module" as const
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export function calculateCodeQualityMetrics(
  rows: CodeQualityRow[],
  weights: CodeQualityWeights,
  snapshotDate?: string
): CodeQualityMetrics {
  const notes: string[] = [];
  if (rows.length === 0) {
    notes.push("No SonarQube code-quality data available.");
    return {
      latest: { date: null, maintainability: null, security: null, vulnerability: null, score: null },
      trend: [],
      breakdown: [],
      groupBy: "module",
      weights,
      notes
    };
  }

  const dates = uniqueSorted(rows.map((row) => row.date));
  const trend = dates.map((date) => snapshotFromRows(
    rows.filter((row) => row.date === date),
    date,
    weights
  ));
  const latest = trend[trend.length - 1] ?? {
    date: null,
    maintainability: null,
    security: null,
    vulnerability: null,
    score: null
  };

  const forBreakdown = snapshotDate ? rows.filter((row) => row.date === snapshotDate) : latestQualityByModule(rows);
  const products = uniqueSorted(forBreakdown.map((row) => row.product));
  const groupBy = products.length > 1 ? "product" : "module";

  return {
    latest,
    trend,
    breakdown: breakdownFromRows(forBreakdown, groupBy, weights),
    groupBy,
    weights,
    notes
  };
}

export function latestQualityScore(rows: CodeQualityRow[], weights: CodeQualityWeights): number | null {
  const latest = latestQualityByModule(rows);
  if (latest.length === 0) {
    return null;
  }
  return average(
    latest
      .map((row) => weightedQualityScore(row.maintainability, row.security, row.vulnerability, weights))
      .filter((value): value is number => value !== null)
  );
}
