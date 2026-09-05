export function formatDecimal(value: number, suffix = ""): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${rounded}${suffix}`;
  }
  return `${rounded.toFixed(2)}${suffix}`;
}

export function formatNumber(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return formatDecimal(value, suffix);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return formatDecimal(value, "%");
}
