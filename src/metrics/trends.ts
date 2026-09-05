import type { MetricDirection, Trend } from "../types.js";

const RELATIVE_THRESHOLD = 0.05;

export function calculateTrend(
  previous: number | null | undefined,
  current: number | null | undefined,
  direction: MetricDirection
): Trend | null {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return null;
  }

  const delta = current - previous;
  const baseline = Math.abs(previous) < 1e-9 ? 1 : Math.abs(previous);
  const relative = Math.abs(delta) / baseline;
  const improved = direction === "higher" ? delta > 0 : delta < 0;

  let trendDirection: Trend["direction"] = "stable";
  if (relative > RELATIVE_THRESHOLD) {
    trendDirection = improved ? "improving" : "declining";
  }

  return { direction: trendDirection, previous, current };
}
