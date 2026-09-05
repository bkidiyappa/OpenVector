import type { Trend } from "../../types";

export function TrendBadge({ trend }: { trend?: Trend | null }) {
  if (!trend) {
    return null;
  }

  const label =
    trend.direction === "improving" ? "Improving" : trend.direction === "declining" ? "Declining" : "Stable";
  const arrow = trend.direction === "improving" ? "↑" : trend.direction === "declining" ? "↓" : "→";
  const color =
    trend.direction === "improving"
      ? "bg-teal-50 text-teal-800"
      : trend.direction === "declining"
        ? "bg-rose-50 text-rose-800"
        : "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <span aria-hidden="true">{arrow}</span>
      {label}
    </span>
  );
}
