import type {
  AppConfig,
  AutomationRow,
  CodeCoverageRow,
  CodeQualityRow,
  DefectRow,
  MaturityComponent,
  MaturityMetrics,
  MaturityTeamBreakdown,
  QualityMetrics
} from "../types.js";
import { maturityBand } from "../config.js";
import { latestCoverageByModule, latestCoveragePercent } from "./coverage.js";
import { latestQualityByModule, latestQualityScore, weightedQualityScore } from "./code-quality.js";
import { calculateTrend } from "./trends.js";
import { calculateTeamDefectLeakage } from "./quality.js";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function scoreFromPercent(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  return clamp(value / 10, 0, 10);
}

export function scoreFromCodeQuality(value: number | null): number | null {
  if (value === null) {
    return null;
  }
  return clamp(value, 0, 10);
}

export function scoreFromLeakage(leakagePercent: number | null, zeroScoreAt: number): number | null {
  if (leakagePercent === null) {
    return null;
  }
  if (zeroScoreAt <= 0) {
    return null;
  }
  return clamp(10 * (1 - leakagePercent / zeroScoreAt), 0, 10);
}

function latestByTeam<T extends { organization: string; vertical: string; product: string; team: string; date: string }>(
  rows: T[]
): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.organization}::${row.vertical}::${row.product}::${row.team}`;
    const current = latest.get(key);
    if (!current || row.date > current.date) {
      latest.set(key, row);
    }
  }
  return [...latest.values()];
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateQualityMaturity(
  automation: AutomationRow[],
  codeCoverage: CodeCoverageRow[],
  codeQuality: CodeQualityRow[],
  quality: QualityMetrics,
  config: AppConfig
): MaturityMetrics {
  const notes: string[] = [];
  const latestAutomation = latestByTeam(automation);
  const automationCoverage = average(latestAutomation.map((row) => row.automation_coverage));
  const coverage = latestCoveragePercent(codeCoverage);
  const codeQualityScore = latestQualityScore(codeQuality, config.codeQuality.weights);
  const leakage = quality.defectLeakage;

  if (latestAutomation.length === 0) {
    notes.push("No automation data available. Automation coverage is excluded from the weighted score.");
  }
  if (codeCoverage.length === 0) {
    notes.push("No code-coverage data available. Coverage is excluded from the weighted score.");
  }
  if (codeQuality.length === 0) {
    notes.push("No SonarQube code-quality data available. Code quality is excluded from the weighted score.");
  }
  if (leakage === null) {
    notes.push("No defect data available. Defect leakage is excluded from the weighted score.");
  }

  const components: MaturityComponent[] = [
    {
      key: "automationCoverage",
      label: "Automation Coverage",
      value: automationCoverage,
      unit: "%",
      score: scoreFromPercent(automationCoverage),
      weight: config.maturity.weights.automationCoverage
    },
    {
      key: "codeCoverage",
      label: "Code Coverage",
      value: coverage,
      unit: "%",
      score: scoreFromPercent(coverage),
      weight: config.maturity.weights.codeCoverage
    },
    {
      key: "codeQuality",
      label: "Code Quality",
      value: codeQualityScore,
      unit: "/10",
      score: scoreFromCodeQuality(codeQualityScore),
      weight: config.maturity.weights.codeQuality
    },
    {
      key: "defectLeakage",
      label: "Defect Leakage",
      value: leakage,
      unit: "%",
      score: scoreFromLeakage(leakage, config.maturity.leakageZeroScoreAt),
      weight: config.maturity.weights.defectLeakage
    }
  ];

  const scored = components.filter((component) => component.score !== null);
  const weightTotal = scored.reduce((sum, component) => sum + component.weight, 0);
  const overall =
    scored.length === 0 || weightTotal <= 0
      ? null
      : scored.reduce((sum, component) => sum + (component.score ?? 0) * component.weight, 0) / weightTotal;

  if (scored.length > 0 && scored.length < components.length) {
    notes.push("Overall maturity uses only the metrics that have source data. Missing metrics are not invented.");
  }

  return {
    overall,
    band: maturityBand(overall === null ? null : Number(overall.toFixed(1)), config.maturity.bands),
    components,
    notes,
    trend: null
  };
}

export function calculateMaturityTeamBreakdown(
  component: string,
  automation: AutomationRow[],
  codeCoverage: CodeCoverageRow[],
  codeQuality: CodeQualityRow[],
  defects: DefectRow[],
  config: AppConfig
): MaturityTeamBreakdown[] {
  if (component === "automationCoverage") {
    return latestByTeam(automation)
      .map((row) => ({
        organization: row.organization,
        vertical: row.vertical,
        product: row.product,
        team: row.team,
        value: row.automation_coverage,
        score: scoreFromPercent(row.automation_coverage),
        unit: "%",
        date: row.date
      }))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }

  if (component === "codeCoverage") {
    return latestCoverageByModule(codeCoverage)
      .map((row) => {
        const coverage = row.coverable_lines > 0 ? (row.covered_lines / row.coverable_lines) * 100 : null;
        return {
          organization: row.organization,
          vertical: row.vertical,
          product: row.product,
          team: row.module,
          module: row.module,
          value: coverage,
          score: scoreFromPercent(coverage),
          unit: "%",
          date: row.date
        };
      })
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }

  if (component === "codeQuality") {
    return latestQualityByModule(codeQuality)
      .map((row) => {
        const score = weightedQualityScore(
          row.maintainability,
          row.security,
          row.vulnerability,
          config.codeQuality.weights
        );
        return {
          organization: row.organization,
          vertical: row.vertical,
          product: row.product,
          team: row.module,
          module: row.module,
          value: score,
          score: scoreFromCodeQuality(score),
          unit: "/10",
          date: row.date
        };
      })
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }

  return calculateTeamDefectLeakage(defects, config.productionPhases)
    .map((row) => ({
      ...row,
      score: scoreFromLeakage(row.value, config.maturity.leakageZeroScoreAt),
      unit: "%",
      date: null
    }))
    .sort((a, b) => (a.value ?? 100) - (b.value ?? 100));
}

export function withMaturityTrend(current: MaturityMetrics, previous: number | null): MaturityMetrics {
  return {
    ...current,
    trend: calculateTrend(previous, current.overall, "higher")
  };
}
