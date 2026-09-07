import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { loadAllData } from "../../src/data/data-service";
import { qualityResponse } from "../../src/api/quality";
import { calculateCopqMetrics, costForDefect } from "../../src/metrics/copq";
import type { CopqRateRow, DefectRow } from "../../src/types";

function defect(overrides: Partial<DefectRow> = {}): DefectRow {
  return {
    id: "D001",
    organization: "Acme",
    vertical: "Payments",
    product: "Checkout",
    team: "Team Alpha",
    title: "Example",
    severity: "Sev3",
    created_date: "2026-07-01",
    detected_date: "2026-07-02",
    resolved_date: "2026-07-10",
    detection_phase: "System Testing",
    customer_reported: false,
    found_in_release: "R12",
    scheduled_for_release: "R12",
    status: "Closed",
    ...overrides
  };
}

const sampleRates: CopqRateRow[] = [
  { detection_phase: "Development", severity: "Sev1", unit_cost: 200 },
  { detection_phase: "Development", severity: "Sev2", unit_cost: 120 },
  { detection_phase: "Development", severity: "Sev3", unit_cost: 60 },
  { detection_phase: "Development", severity: "Sev4", unit_cost: 30 },
  { detection_phase: "System Testing", severity: "Sev1", unit_cost: 800 },
  { detection_phase: "System Testing", severity: "Sev2", unit_cost: 400 },
  { detection_phase: "System Testing", severity: "Sev3", unit_cost: 200 },
  { detection_phase: "System Testing", severity: "Sev4", unit_cost: 80 },
  { detection_phase: "UAT", severity: "Sev1", unit_cost: 2000 },
  { detection_phase: "UAT", severity: "Sev2", unit_cost: 1000 },
  { detection_phase: "UAT", severity: "Sev3", unit_cost: 400 },
  { detection_phase: "UAT", severity: "Sev4", unit_cost: 150 },
  { detection_phase: "Production", severity: "Sev1", unit_cost: 8000 },
  { detection_phase: "Production", severity: "Sev2", unit_cost: 4000 },
  { detection_phase: "Production", severity: "Sev3", unit_cost: 1500 },
  { detection_phase: "Production", severity: "Sev4", unit_cost: 500 }
];

describe("COPQ lookup", () => {
  const { config } = loadConfig(".");

  it("prices a defect from phase and severity", () => {
    expect(costForDefect(defect({ detection_phase: "Production", severity: "Sev1" }), sampleRates, config)).toBe(8000);
    expect(costForDefect(defect({ detection_phase: "Development", severity: "Sev4" }), sampleRates, config)).toBe(30);
  });

  it("maps phase aliases and severity groups", () => {
    expect(costForDefect(defect({ detection_phase: "Unit Testing", severity: "Critical" }), sampleRates, config)).toBe(
      200
    );
    expect(costForDefect(defect({ detection_phase: "UAT", severity: "critical" }), sampleRates, config)).toBe(2000);
    expect(
      costForDefect(
        defect({ detection_phase: "System Testing", severity: "high" }),
        [{ detection_phase: "System Testing", severity: "high", unit_cost: 400 }],
        config
      )
    ).toBe(400);
  });

  it("omits defects with no matching rate instead of inventing zero", () => {
    expect(costForDefect(defect({ detection_phase: "Production", severity: "Unknown" }), sampleRates, config)).toBeNull();
    const result = calculateCopqMetrics(
      [
        defect({ id: "D1", detection_phase: "Production", severity: "Sev1" }),
        defect({ id: "D2", detection_phase: "Production", severity: "Mystery" })
      ],
      sampleRates,
      config,
      "2026-07-01"
    );
    expect(result?.total).toBe(8000);
    expect(result?.pricedCount).toBe(1);
    expect(result?.omittedCount).toBe(1);
    expect(result?.notes[0]).toContain("omitted from cost");
  });

  it("returns null when rates are absent", () => {
    expect(calculateCopqMetrics([defect()], [], config, "2026-07-01")).toBeNull();
  });
});

describe("COPQ aggregations", () => {
  const { config } = loadConfig(".");

  it("equals count × unit_cost for a homogeneous bucket", () => {
    const defects = [
      defect({ id: "D1", detection_phase: "UAT", severity: "Sev2" }),
      defect({ id: "D2", detection_phase: "UAT", severity: "Sev2" }),
      defect({ id: "D3", detection_phase: "UAT", severity: "Sev2" })
    ];
    const result = calculateCopqMetrics(defects, sampleRates, config, "2026-07-01");
    expect(result?.total).toBe(3 * 1000);
    expect(result?.byPhase.find((row) => row.phase === "UAT")).toEqual({ phase: "UAT", cost: 3000, count: 3 });
    expect(result?.bySeverity.find((row) => row.key === "high")).toEqual({
      key: "high",
      label: "High",
      cost: 3000,
      count: 3
    });
  });

  it("sums mixed severities in a phase instead of using one unit cost", () => {
    const result = calculateCopqMetrics(
      [
        defect({ id: "D1", detection_phase: "Development", severity: "Sev1" }),
        defect({ id: "D2", detection_phase: "Development", severity: "Sev4" })
      ],
      sampleRates,
      config,
      "2026-07-01"
    );
    expect(result?.byPhase.find((row) => row.phase === "Development")?.cost).toBe(200 + 30);
  });

  it("rolls cost up by created_date and by release", () => {
    const result = calculateCopqMetrics(
      [
        defect({
          id: "D1",
          detection_phase: "Development",
          severity: "Sev1",
          created_date: "2026-07-01",
          found_in_release: "R11"
        }),
        defect({
          id: "D2",
          detection_phase: "Production",
          severity: "Sev1",
          created_date: "2026-07-02",
          found_in_release: "R12"
        }),
        defect({
          id: "D3",
          detection_phase: "UAT",
          severity: "Sev3",
          created_date: "2026-07-02",
          found_in_release: "R12"
        })
      ],
      sampleRates,
      config,
      "2026-07-03"
    );
    expect(result?.byRelease.map((row) => ({ release: row.release, cost: row.cost, count: row.count }))).toEqual([
      { release: "R11", cost: 200, count: 1 },
      { release: "R12", cost: 8400, count: 2 }
    ]);
    expect(result?.byRelease[1].byPhase.find((row) => row.phase === "Production")).toEqual({
      phase: "Production",
      cost: 8000,
      count: 1
    });
    expect(result?.byRelease[1].products.map((row) => row.product)).toEqual(["Checkout"]);
    expect(result?.byProduct.find((row) => row.product === "Checkout")?.byRelease.map((row) => row.key)).toEqual([
      "R11",
      "R12"
    ]);
    expect(result?.dailyTrend.map((row) => ({ date: row.date, cost: row.cost, count: row.count }))).toEqual([
      { date: "2026-07-01", cost: 200, count: 1 },
      { date: "2026-07-02", cost: 8400, count: 2 },
      { date: "2026-07-03", cost: 0, count: 0 }
    ]);
    expect(result?.dailyTrend[1].byPhase.find((row) => row.phase === "Production")).toEqual({
      phase: "Production",
      cost: 8000,
      count: 1
    });
    expect(result?.trend?.previous).toBe(200);
    expect(result?.trend?.current).toBe(8400);
    expect(result?.trend?.direction).toBe("declining");
  });
});

describe("sample COPQ data", () => {
  it("prices the Quality view from copq-rates.csv", () => {
    const { config } = loadConfig(".");
    const data = loadAllData(config, ".");
    const quality = qualityResponse(data, config, {});
    expect(quality.copq).not.toBeNull();
    expect(quality.copq?.currency).toBe("USD");
    expect(quality.copq?.total).toBeGreaterThan(0);
    expect(quality.copq?.byPhase.map((row) => row.phase)).toEqual(config.detectionPhases);
    expect(quality.copq?.byRelease.length).toBeGreaterThan(0);
    expect(quality.copq?.byRelease[0].byPhase.length).toBe(config.detectionPhases.length);
    expect(quality.copq?.byProduct.length).toBeGreaterThan(0);
  });
});
