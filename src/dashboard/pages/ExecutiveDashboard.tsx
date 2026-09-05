import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOverview } from "../api";
import { useFilters } from "../FilterContext";
import { MetricCard } from "../components/MetricCard";
import { NotesList } from "../components/NotesList";
import { formatNumber, formatPercent } from "../format";
import type { OverviewMetrics } from "../../types";

export function ExecutiveDashboard() {
  const { filter } = useFilters();
  const [data, setData] = useState<OverviewMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void getOverview(filter)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading overview…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Executive view of engineering health. Team trends only — no individual rankings.</p>
      </div>
      <NotesList notes={data.notes} />
      <section className="grid gap-4 lg:grid-cols-3">
        <Link to="/maturity" className="block">
          <MetricCard
            label="Quality Maturity"
            value={data.maturity.overall === null ? "—" : `${formatNumber(data.maturity.overall)} / 10`}
            hint={data.maturity.band}
            trend={data.maturity.trend}
          />
        </Link>
        <Link to="/productivity" className="block">
          <MetricCard
            label="Velocity"
            value={formatNumber(data.productivity.velocity, " SP")}
            hint="Completed story points in the latest sprint"
            trend={data.productivity.trends.velocity}
          />
        </Link>
        <Link to="/productivity" className="block">
          <MetricCard
            label="SP / Capacity Day"
            value={formatNumber(data.productivity.storyPointsPerCapacityDay)}
            hint="Completed points divided by available person-days"
            trend={data.productivity.trends.storyPointsPerCapacityDay}
          />
        </Link>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/quality" state={{ drill: { productionOnly: true } }} className="block">
          <MetricCard
            label="Defect Leakage"
            value={formatPercent(data.quality.defectLeakage)}
            hint="Production-phase defects ÷ defects in view"
            trend={data.quality.trends.defectLeakage}
          />
        </Link>
        <Link to="/quality" state={{ drill: { status: "open" } }} className="block">
          <MetricCard label="Open Defects" value={String(data.quality.openDefects)} hint="Not closed or resolved" />
        </Link>
        <Link to="/quality" state={{ drill: { origin: "external" } }} className="block">
          <MetricCard label="Customer Defects" value={String(data.quality.customerDefects)} hint="External / customer-reported" />
        </Link>
      </section>
    </div>
  );
}
