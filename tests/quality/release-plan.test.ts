import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { calculateDailyOpenClose } from "../../src/metrics/quality";
import { calculateReleaseMilestones } from "../../src/metrics/release-plan";
import type { DefectRow, ReleasePlanRow } from "../../src/types";

const plan = (overrides: Partial<ReleasePlanRow> = {}): ReleasePlanRow => ({
  organization: "Acme",
  vertical: "Payments",
  product: "Checkout",
  release: "R12",
  dev_start: "2026-06-18",
  dev_complete: "2026-07-22",
  test_start: "2026-07-08",
  test_complete: "2026-08-10",
  prod_deployment: "2026-08-20",
  ...overrides
});

const defect = (overrides: Partial<DefectRow> = {}): DefectRow => ({
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
});

describe("release plan milestones", () => {
  it("returns dated milestones for the selected release", () => {
    const milestones = calculateReleaseMilestones([plan(), plan({ product: "Booking", release: "R11" })], "R12");
    expect(milestones.map((item) => item.label)).toEqual([
      "Dev Start",
      "Test Start",
      "Dev Complete",
      "Test Complete",
      "Prod Deployment"
    ]);
    expect(milestones[0]?.date).toBe("2026-06-18");
  });

  it("labels split dates when products disagree", () => {
    const milestones = calculateReleaseMilestones(
      [plan(), plan({ product: "Booking", dev_start: "2026-06-20" })],
      "R12"
    );
    const starts = milestones.filter((item) => item.key === "dev_start");
    expect(starts).toHaveLength(2);
    expect(starts[0]?.label).toContain("Checkout");
    expect(starts[1]?.label).toContain("Booking");
  });

  it("skips empty milestone dates", () => {
    const milestones = calculateReleaseMilestones(
      [plan({ test_complete: null, prod_deployment: null })],
      "R12"
    );
    expect(milestones.some((item) => item.key === "prod_deployment")).toBe(false);
  });

  it("extends the daily trend so milestone dates exist on the axis", () => {
    const { config } = loadConfig(".");
    const days = calculateDailyOpenClose(
      [defect()],
      config.closedStatuses,
      "2026-07-10",
      ["2026-06-18", "2026-07-22"]
    );
    expect(days[0]?.date).toBe("2026-06-13");
    expect(days.at(-1)?.date).toBe("2026-07-22");
    expect(days.find((day) => day.date === "2026-06-18")).toMatchObject({ opened: 0, closed: 0 });
  });
});
