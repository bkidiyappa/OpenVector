import type { Trend } from "../../types";
import { TrendBadge } from "./TrendBadge";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  trend?: Trend | null;
  active?: boolean;
};

export function MetricCard({ label, value, hint, trend, active }: MetricCardProps) {
  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        active ? "border-teal-600 ring-1 ring-teal-600" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <TrendBadge trend={trend} />
      </div>
      <p className="mt-3 font-mono text-3xl font-medium tracking-tight text-ink-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </article>
  );
}
