import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { calculateQualityMaturity, scoreFromLeakage, scoreFromPercent } from "../../src/metrics/maturity";
import type { QualityMetrics } from "../../src/types";

const emptyQuality: QualityMetrics = {
  defectLeakage: 4.2,
  openDefects: 0,
  customerDefects: 0,
  totalDefects: 0,
  latestRelease: null,
  selectedRelease: null,
  dreByRelease: [],
  openClosedByRelease: [],
  releasePhaseDre: [],
  detectionPhases: [],
  dailyTrend: [],
  dailyTrends: [],
  releaseMilestones: [],
  byStatus: [],
  bySeverity: [],
  byPhase: [],
  byAge: [],
  internalVsExternal: [],
  notes: [],
  trends: { defectLeakage: null, openDefects: null, customerDefects: null }
};

describe("maturity scoring", () => {
  it("converts percentage metrics by dividing by 10", () => {
    expect(scoreFromPercent(82)).toBeCloseTo(8.2);
    expect(scoreFromPercent(76)).toBeCloseTo(7.6);
  });

  it("scores leakage so that 0% is 10 and 21% is 0", () => {
    expect(scoreFromLeakage(0, 21)).toBe(10);
    expect(scoreFromLeakage(21, 21)).toBe(0);
    expect(scoreFromLeakage(4.2, 21)).toBeCloseTo(8.0, 1);
  });

  it("computes a weighted overall score from available inputs", () => {
    const { config } = loadConfig(".");
    const result = calculateQualityMaturity(
      [
        {
          organization: "Acme",
          vertical: "Payments",
          product: "Checkout",
          team: "Team Alpha",
          date: "2026-08-25",
          automation_coverage: 82
        }
      ],
      [
        {
          organization: "Acme",
          vertical: "Payments",
          product: "Checkout",
          module: "checkout-api",
          date: "2026-08-25",
          total_lines: 15800,
          coverable_lines: 13000,
          covered_lines: 9880
        }
      ],
      [
        {
          organization: "Acme",
          vertical: "Payments",
          product: "Checkout",
          module: "checkout-api",
          date: "2026-08-25",
          maintainability: 8.4,
          security: 8.6,
          vulnerability: 8.2
        }
      ],
      emptyQuality,
      config
    );

    expect(result.overall).not.toBeNull();
    expect(result.overall ?? 0).toBeGreaterThan(7);
    expect(result.overall ?? 0).toBeLessThan(9);
    expect(result.band).toBe("Optimized");
    expect(result.components.find((item) => item.key === "codeCoverage")?.value).toBeCloseTo(76, 0);
    expect(result.components.find((item) => item.key === "codeQuality")?.value).toBeCloseTo(8.4, 1);
  });

  it("does not invent a score when every input is missing", () => {
    const { config } = loadConfig(".");
    const result = calculateQualityMaturity([], [], [], { ...emptyQuality, defectLeakage: null }, config);
    expect(result.overall).toBeNull();
    expect(result.band).toBe("Unavailable");
  });
});
