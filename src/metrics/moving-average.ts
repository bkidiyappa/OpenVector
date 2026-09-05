export function calculateMovingAverage(values: number[], window: number): number[] {
  if (window <= 0) {
    throw new Error("Moving-average window must be greater than 0");
  }

  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    const total = slice.reduce((sum, value) => sum + value, 0);
    return total / slice.length;
  });
}
