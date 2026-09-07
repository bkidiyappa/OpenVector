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

export function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const fractionDigits = Number.isInteger(Math.round(value * 100) / 100) ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${formatDecimal(value)} ${currency}`;
  }
}

export function chartTooltipFormatter(value: unknown, name: unknown): [string, string] {
  const label = name == null ? "" : String(name);
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return [String(value ?? ""), label];
  }
  const magnitude = label === "Closed" ? Math.abs(numeric) : numeric;
  if (label === "DRE" || label === "Coverage") {
    return [formatPercent(magnitude), label];
  }
  return [formatNumber(magnitude), label];
}

export function chartCurrencyTooltipFormatter(currency: string) {
  return (value: unknown, name: unknown): [string, string] => {
    const label = name == null ? "" : String(name);
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return [String(value ?? ""), label];
    }
    return [formatCurrency(numeric, currency), label];
  };
}
