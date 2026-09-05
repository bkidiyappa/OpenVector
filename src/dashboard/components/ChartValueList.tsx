import { formatDecimal } from "../format";

export type ChartLabelOptions = {
  suffix?: string;
  abs?: boolean;
  hideZero?: boolean;
  position?: "top" | "bottom";
};

function formatLabel(value: unknown, suffix: string, abs: boolean, hideZero: boolean): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  if (hideZero && numeric === 0) {
    return "";
  }
  return formatDecimal(abs ? Math.abs(numeric) : numeric, suffix);
}

export function chartLabel(visible: boolean, options: ChartLabelOptions = {}) {
  if (!visible) {
    return false;
  }

  return {
    position: options.position ?? "top",
    fill: "#0f172a",
    fontSize: 11,
    fontWeight: 600,
    offset: 6,
    formatter: (value: unknown) => formatLabel(value, options.suffix ?? "", Boolean(options.abs), Boolean(options.hideZero))
  };
}
