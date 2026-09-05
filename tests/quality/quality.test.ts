import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import {
  bucketAge,
  calculateDailyOpenClose,
  calculateDefectAgeDays,
  calculateDefectLeakage,
  calculateDefectRemovalEfficiency,
  calculateQualityMetrics,
  calculateReleasePhaseDre,
  filterDefectsForDrill
} from "../../src/metrics/quality";
import type { DefectRow } from "../../src/types";

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

describe("defect leakage", () => {
  it("is 5% when 5 of 100 defects are production", () => {
    const defects = Array.from({ length: 100 }, (_, index) =>
      defect({
        id: `D${index + 1}`,
        detection_phase: index < 5 ? "Production" : "System Testing"
      })
    );
    expect(calculateDefectLeakage(defects, ["Production"])).toBe(5);
  });

  it("returns null when there are no defects", () => {
    expect(calculateDefectLeakage([], ["Production"])).toBeNull();
  });

  it("is 95% DRE when 5 of 100 defects leak to production", () => {
    const defects = Array.from({ length: 100 }, (_, index) =>
      defect({
        id: `D${index + 1}`,
        detection_phase: index < 5 ? "Production" : "System Testing"
      })
    );
    expect(calculateDefectRemovalEfficiency(defects, ["Production"])).toBe(95);
  });
});

describe("release phase and DRE", () => {
  it("counts phases per found_in_release and computes DRE", () => {
    const { config } = loadConfig(".");
    const rows = calculateReleasePhaseDre(
      [
        defect({ id: "D1", found_in_release: "R11", detection_phase: "Development" }),
        defect({ id: "D2", found_in_release: "R11", detection_phase: "Production" }),
        defect({ id: "D3", found_in_release: "R12", detection_phase: "UAT" })
      ],
      config.detectionPhases,
      config.productionPhases,
      config.closedStatuses,
      config.phaseAliases
    );
    expect(rows[0]).toMatchObject({ release: "R11", dre: 50, counts: expect.objectContaining({ Development: 1, Production: 1 }) });
    expect(rows[1]).toMatchObject({ release: "R12", dre: 100, counts: expect.objectContaining({ UAT: 1, Production: 0 }) });
  });
});

describe("daily open and close", () => {
  it("counts opens, closes, and running backlog", () => {
    const { config } = loadConfig(".");
    const days = calculateDailyOpenClose(
      [
        defect({ id: "D1", created_date: "2026-07-01", resolved_date: "2026-07-02", status: "Closed" }),
        defect({ id: "D2", created_date: "2026-07-01", resolved_date: null, status: "Open" })
      ],
      config.closedStatuses,
      "2026-07-03"
    );
    expect(days[0]).toMatchObject({ date: "2026-07-01", opened: 2, closed: 0, openBacklog: 2 });
    expect(days[1]).toMatchObject({ date: "2026-07-02", opened: 0, closed: 1, openBacklog: 1 });
  });
});

describe("defect age", () => {
  const { config } = loadConfig(".");

  it("uses resolved minus created for closed defects", () => {
    expect(
      calculateDefectAgeDays(
        defect({ created_date: "2026-07-01", resolved_date: "2026-07-10", status: "Closed" }),
        "2026-09-05",
        config.closedStatuses
      )
    ).toBe(9);
  });

  it("uses today minus created for open defects", () => {
    expect(
      calculateDefectAgeDays(
        defect({ created_date: "2026-07-01", resolved_date: null, status: "Open" }),
        "2026-07-20",
        config.closedStatuses
      )
    ).toBe(19);
  });

  it("places ages in the default buckets", () => {
    expect(bucketAge(3, config.ageBuckets)).toBe("0–7 days");
    expect(bucketAge(10, config.ageBuckets)).toBe("8–14 days");
    expect(bucketAge(100, config.ageBuckets)).toBe(">90 days");
  });
});

describe("quality metrics", () => {
  it("returns matching rows for a severity drill-down", () => {
    const { config } = loadConfig(".");
    const rows = filterDefectsForDrill(
      [
        defect({ id: "D1", severity: "Sev1" }),
        defect({ id: "D2", severity: "Sev3" }),
        defect({ id: "D3", severity: "Sev1", customer_reported: true })
      ],
      config,
      { severity: "critical" },
      "2026-09-05"
    );
    expect(rows.map((row) => row.id)).toEqual(["D1", "D3"]);
  });

  it("counts customer-reported defects as external", () => {
    const { config } = loadConfig(".");
    const result = calculateQualityMetrics(
      [defect({ customer_reported: true }), defect({ id: "D002", customer_reported: false, detection_phase: "UAT" })],
      config,
      "2026-09-05"
    );
    expect(result.customerDefects).toBe(1);
    expect(result.internalVsExternal).toEqual([
      { key: "internal", count: 1 },
      { key: "external", count: 1 }
    ]);
    expect(result.byPhase.map((row) => row.phase)).toEqual([
      "Development",
      "System Testing",
      "UAT",
      "Production"
    ]);
  });
});
