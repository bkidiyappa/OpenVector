import type { ProductivityMetrics, SprintRow, SprintTeamBreakdown } from "../types.js";
import { calculateMovingAverage } from "./moving-average.js";
import { calculateTrend } from "./trends.js";

export function calculateGrossCapacity(teamSize: number, workingDays: number): number {
  return teamSize * workingDays;
}

export function calculateHolidayCapacity(teamSize: number, holidayDays: number): number {
  return teamSize * holidayDays;
}

export function calculateAvailableCapacity(input: {
  teamSize: number;
  workingDays: number;
  holidayDays: number;
  leaveDays: number;
}): number {
  return (
    calculateGrossCapacity(input.teamSize, input.workingDays) -
    calculateHolidayCapacity(input.teamSize, input.holidayDays) -
    input.leaveDays
  );
}

export function calculateVelocity(completedPoints: number): number {
  return completedPoints;
}

export function calculateStoryPointsPerCapacityDay(
  completedPoints: number,
  availableCapacity: number
): number | null {
  if (availableCapacity <= 0) {
    return null;
  }
  return completedPoints / availableCapacity;
}

type AggregatedSprint = {
  sprint: string;
  startDate: string;
  endDate: string;
  plannedPoints: number;
  completedPoints: number;
  availableCapacity: number;
};

export function aggregateSprints(sprints: SprintRow[]): AggregatedSprint[] {
  const groups = new Map<string, AggregatedSprint>();

  for (const sprint of sprints) {
    const key = `${sprint.sprint}::${sprint.end_date}`;
    const availableCapacity = calculateAvailableCapacity({
      teamSize: sprint.team_size,
      workingDays: sprint.working_days,
      holidayDays: sprint.holiday_days,
      leaveDays: sprint.leave_days
    });
    const existing = groups.get(key);
    if (existing) {
      existing.plannedPoints += sprint.planned_points;
      existing.completedPoints += sprint.completed_points;
      existing.availableCapacity += availableCapacity;
      if (sprint.start_date < existing.startDate) {
        existing.startDate = sprint.start_date;
      }
    } else {
      groups.set(key, {
        sprint: sprint.sprint,
        startDate: sprint.start_date,
        endDate: sprint.end_date,
        plannedPoints: sprint.planned_points,
        completedPoints: sprint.completed_points,
        availableCapacity
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.endDate.localeCompare(b.endDate) || a.sprint.localeCompare(b.sprint));
}

export function latestSprintPerTeam(sprints: SprintRow[]): SprintRow[] {
  const latest = new Map<string, SprintRow>();
  for (const sprint of sprints) {
    const key = `${sprint.organization}::${sprint.vertical}::${sprint.product}::${sprint.team}`;
    const current = latest.get(key);
    if (!current || sprint.end_date > current.end_date) {
      latest.set(key, sprint);
    }
  }
  return [...latest.values()];
}

export function breakdownSprintByTeam(sprints: SprintRow[], sprint: string, endDate?: string): SprintTeamBreakdown[] {
  return sprints
    .filter((row) => row.sprint === sprint && (!endDate || row.end_date === endDate))
    .map((row) => {
      const availableCapacity = calculateAvailableCapacity({
        teamSize: row.team_size,
        workingDays: row.working_days,
        holidayDays: row.holiday_days,
        leaveDays: row.leave_days
      });
      return {
        sprint: row.sprint,
        endDate: row.end_date,
        organization: row.organization,
        vertical: row.vertical,
        product: row.product,
        team: row.team,
        plannedPoints: row.planned_points,
        completedPoints: row.completed_points,
        availableCapacity,
        velocity: calculateVelocity(row.completed_points),
        storyPointsPerCapacityDay: calculateStoryPointsPerCapacityDay(row.completed_points, availableCapacity)
      };
    })
    .sort((a, b) => b.completedPoints - a.completedPoints || a.team.localeCompare(b.team));
}

export function calculateProductivityMetrics(
  sprints: SprintRow[],
  movingAverageWindow: number
): ProductivityMetrics {
  const notes: string[] = [];
  const aggregated = aggregateSprints(sprints);
  const window = Math.max(1, movingAverageWindow);
  const completed = aggregated.map((sprint) => sprint.completedPoints);
  const averages = calculateMovingAverage(completed, window);

  const sprintMetrics = aggregated.map((sprint, index) => ({
    sprint: sprint.sprint,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    plannedPoints: sprint.plannedPoints,
    completedPoints: sprint.completedPoints,
    availableCapacity: sprint.availableCapacity,
    velocity: calculateVelocity(sprint.completedPoints),
    storyPointsPerCapacityDay: calculateStoryPointsPerCapacityDay(sprint.completedPoints, sprint.availableCapacity),
    movingAverage: averages[index] ?? null
  }));

  const usedWindow = Math.min(window, aggregated.length);
  if (aggregated.length === 0) {
    notes.push("No sprint data available. Velocity and capacity metrics are not calculated.");
  } else if (aggregated.length < window) {
    notes.push(
      `Only ${aggregated.length} sprint${aggregated.length === 1 ? "" : "s"} available. Moving average calculated using ${aggregated.length} sprint${aggregated.length === 1 ? "" : "s"}.`
    );
  }

  const latestRows = latestSprintPerTeam(sprints);
  const latestCapacity = latestRows.reduce(
    (sum, sprint) =>
      sum +
      calculateAvailableCapacity({
        teamSize: sprint.team_size,
        workingDays: sprint.working_days,
        holidayDays: sprint.holiday_days,
        leaveDays: sprint.leave_days
      }),
    0
  );
  const latestCompleted = latestRows.reduce((sum, sprint) => sum + sprint.completed_points, 0);
  const latestLabel =
    latestRows.length === 1
      ? latestRows[0].sprint
      : latestRows.length > 1
        ? "Latest sprint per team"
        : null;

  const previous = sprintMetrics.length >= 2 ? sprintMetrics[sprintMetrics.length - 2] : null;
  const last = sprintMetrics.length >= 1 ? sprintMetrics[sprintMetrics.length - 1] : null;

  return {
    latest: {
      sprint: latestLabel,
      availableCapacity: latestRows.length > 0 ? latestCapacity : null,
      completedPoints: latestRows.length > 0 ? latestCompleted : null,
      storyPointsPerCapacityDay:
        latestRows.length > 0 ? calculateStoryPointsPerCapacityDay(latestCompleted, latestCapacity) : null,
      velocity: latestRows.length > 0 ? latestCompleted : null
    },
    sprints: sprintMetrics,
    movingAverageWindow: window,
    usedWindow,
    notes,
    trends: {
      velocity: last ? calculateTrend(previous?.velocity ?? null, last.velocity, "higher") : null,
      storyPointsPerCapacityDay: last
        ? calculateTrend(previous?.storyPointsPerCapacityDay ?? null, last.storyPointsPerCapacityDay, "higher")
        : null
    }
  };
}
