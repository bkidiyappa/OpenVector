import { describe, expect, it } from "vitest";
import {
  breakdownSprintByTeam,
  calculateAvailableCapacity,
  calculateProductivityMetrics,
  calculateStoryPointsPerCapacityDay,
  calculateVelocity
} from "../../src/metrics/productivity";
import { calculateMovingAverage } from "../../src/metrics/moving-average";
import type { SprintRow } from "../../src/types";

function sprint(overrides: Partial<SprintRow> = {}): SprintRow {
  return {
    organization: "Acme",
    vertical: "Payments",
    product: "Checkout",
    team: "Team Alpha",
    sprint: "Sprint 1",
    start_date: "2026-07-01",
    end_date: "2026-07-14",
    team_size: 10,
    working_days: 10,
    holiday_days: 1,
    leave_days: 2,
    planned_points: 45,
    completed_points: 42,
    ...overrides
  };
}

describe("capacity", () => {
  it("matches the spec example of 88 person-days", () => {
    expect(
      calculateAvailableCapacity({
        teamSize: 10,
        workingDays: 10,
        holidayDays: 1,
        leaveDays: 2
      })
    ).toBe(88);
  });
});

describe("velocity", () => {
  it("equals completed story points", () => {
    expect([40, 45, 50].map(calculateVelocity)).toEqual([40, 45, 50]);
  });
});

describe("story points per capacity day", () => {
  it("divides completed points by available person-days", () => {
    expect(calculateStoryPointsPerCapacityDay(44, 88)).toBe(0.5);
  });

  it("returns null when capacity is zero", () => {
    expect(calculateStoryPointsPerCapacityDay(10, 0)).toBeNull();
  });
});

describe("moving average", () => {
  it("uses all available values until the window is full", () => {
    expect(calculateMovingAverage([10, 20, 30], 6)).toEqual([10, 15, 20]);
  });

  it("uses a 3-sprint window when only 3 sprints exist", () => {
    const result = calculateProductivityMetrics(
      [
        sprint({ sprint: "S1", end_date: "2026-06-01", completed_points: 10 }),
        sprint({ sprint: "S2", end_date: "2026-06-15", completed_points: 20 }),
        sprint({ sprint: "S3", end_date: "2026-06-29", completed_points: 30 })
      ],
      6
    );
    expect(result.usedWindow).toBe(3);
    expect(result.sprints.map((row) => row.movingAverage)).toEqual([10, 15, 20]);
    expect(result.notes[0]).toContain("Only 3 sprints available");
  });

  it("uses six sprints when six are present", () => {
    const sprints = [10, 20, 30, 40, 50, 60].map((points, index) =>
      sprint({
        sprint: `S${index + 1}`,
        end_date: `2026-0${index + 1}-01`,
        completed_points: points
      })
    );
    const result = calculateProductivityMetrics(sprints, 6);
    expect(result.usedWindow).toBe(6);
    expect(result.sprints.at(-1)?.movingAverage).toBe(35);
  });

  it("breaks a sprint down by team", () => {
    const rows = breakdownSprintByTeam(
      [
        sprint({ team: "Team Alpha", sprint: "Sprint 21", completed_points: 42, planned_points: 45 }),
        sprint({ team: "Team Beta", sprint: "Sprint 21", team_size: 8, completed_points: 31, planned_points: 34 }),
        sprint({ team: "Team Alpha", sprint: "Sprint 22", end_date: "2026-07-28", completed_points: 10 })
      ],
      "Sprint 21"
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].team).toBe("Team Alpha");
    expect(rows[0].availableCapacity).toBe(88);
    expect(rows.map((row) => row.team)).toEqual(["Team Alpha", "Team Beta"]);
  });

  it("uses the latest six sprints when more than six exist", () => {
    const sprints = [10, 20, 30, 40, 50, 60, 70].map((points, index) =>
      sprint({
        sprint: `S${index + 1}`,
        end_date: `2026-0${index + 1}-01`,
        completed_points: points
      })
    );
    const result = calculateProductivityMetrics(sprints, 6);
    expect(result.sprints.at(-1)?.movingAverage).toBe(45);
  });
});
