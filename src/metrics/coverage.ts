import type { CodeCoverageRow, CoverageBreakdown, CoverageMetrics, CoverageSnapshot } from "../types.js";

export function coveragePercent(coverableLines: number, coveredLines: number): number | null {
  if (coverableLines <= 0) {
    return null;
  }
  return (coveredLines / coverableLines) * 100;
}

function moduleKey(row: Pick<CodeCoverageRow, "organization" | "vertical" | "product" | "module">): string {
  return `${row.organization}::${row.vertical}::${row.product}::${row.module}`;
}

export function latestCoverageByModule(rows: CodeCoverageRow[]): CodeCoverageRow[] {
  const latest = new Map<string, CodeCoverageRow>();
  for (const row of rows) {
    const key = moduleKey(row);
    const current = latest.get(key);
    if (!current || row.date > current.date) {
      latest.set(key, row);
    }
  }
  return [...latest.values()];
}

export function aggregateCoverage(rows: CodeCoverageRow[], date: string | null): CoverageSnapshot {
  const totalLines = rows.reduce((sum, row) => sum + row.total_lines, 0);
  const coverableLines = rows.reduce((sum, row) => sum + row.coverable_lines, 0);
  const coveredLines = rows.reduce((sum, row) => sum + row.covered_lines, 0);
  return {
    date,
    coverage: coveragePercent(coverableLines, coveredLines),
    totalLines,
    coverableLines,
    coveredLines
  };
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function breakdownFromRows(rows: CodeCoverageRow[], groupBy: "product" | "module"): CoverageBreakdown[] {
  if (groupBy === "product") {
    const products = uniqueSorted(rows.map((row) => row.product));
    return products
      .map((product) => {
        const scoped = rows.filter((row) => row.product === product);
        const first = scoped[0];
        const snapshot = aggregateCoverage(scoped, first?.date ?? null);
        return {
          ...snapshot,
          organization: first?.organization ?? "",
          vertical: first?.vertical ?? "",
          product,
          module: "",
          label: product,
          level: "product" as const
        };
      })
      .sort((a, b) => (b.coverage ?? 0) - (a.coverage ?? 0));
  }

  return latestCoverageByModule(rows)
    .map((row) => ({
      ...aggregateCoverage([row], row.date),
      organization: row.organization,
      vertical: row.vertical,
      product: row.product,
      module: row.module,
      label: row.module,
      level: "module" as const
    }))
    .sort((a, b) => (b.coverage ?? 0) - (a.coverage ?? 0));
}

export function calculateCoverageMetrics(rows: CodeCoverageRow[], snapshotDate?: string): CoverageMetrics {
  const notes: string[] = [];
  if (rows.length === 0) {
    notes.push("No code-coverage data available.");
    return {
      latest: { date: null, coverage: null, totalLines: 0, coverableLines: 0, coveredLines: 0 },
      trend: [],
      breakdown: [],
      groupBy: "module",
      notes
    };
  }

  const dates = uniqueSorted(rows.map((row) => row.date));
  const trend = dates.map((date) => aggregateCoverage(
    rows.filter((row) => row.date === date),
    date
  ));
  const latest = trend[trend.length - 1] ?? {
    date: null,
    coverage: null,
    totalLines: 0,
    coverableLines: 0,
    coveredLines: 0
  };

  const forBreakdown = snapshotDate ? rows.filter((row) => row.date === snapshotDate) : latestCoverageByModule(rows);
  const products = uniqueSorted(forBreakdown.map((row) => row.product));
  const groupBy = products.length > 1 ? "product" : "module";

  return {
    latest,
    trend,
    breakdown: breakdownFromRows(forBreakdown, groupBy),
    groupBy,
    notes
  };
}

export function latestCoveragePercent(rows: CodeCoverageRow[]): number | null {
  return aggregateCoverage(latestCoverageByModule(rows), null).coverage;
}
