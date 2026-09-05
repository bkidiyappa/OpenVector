import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DefectDrillFilter, DefectListItem, QualityMetrics } from "../../types";
import { getQuality, getQualityDefects } from "../api";
import { ChartCard, ChartLink } from "../components/ChartCard";
import { chartLabel } from "../components/ChartValueList";
import { DataTable } from "../components/DataTable";
import { MetricCard } from "../components/MetricCard";
import { NotesList } from "../components/NotesList";
import { useFilters } from "../FilterContext";
import { formatPercent } from "../format";
import { MILESTONE_COLORS } from "../../metrics/release-plan";

type MilestoneLabelProps = {
  viewBox?: { x?: number; y?: number; height?: number };
  text: string;
  fill: string;
};

function MilestoneLabel({ viewBox, text, fill }: MilestoneLabelProps) {
  if (viewBox?.x == null || viewBox.y == null) {
    return null;
  }
  const x = viewBox.x - 7;
  const y = viewBox.y + (viewBox.height ?? 0) / 2;
  return (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={10}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(-90 ${x} ${y})`}
      stroke="#ffffff"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

const PHASE_BAR_COLORS: Record<string, string> = {
  Development: "#64748b",
  "System Testing": "#0f766e",
  UAT: "#0369a1",
  Production: "#be123c"
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#be123c",
  high: "#c2410c",
  medium: "#ca8a04",
  low: "#64748b",
  unmapped: "#94a3b8"
};

function toggleField<K extends keyof DefectDrillFilter>(
  current: DefectDrillFilter,
  key: K,
  value: DefectDrillFilter[K]
): DefectDrillFilter {
  const next = { ...current };
  if (next[key] === value) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

function drillLabel(drill: DefectDrillFilter): string {
  const parts = [
    drill.release,
    drill.severity,
    drill.phase,
    drill.origin,
    drill.ageBucket,
    drill.status,
    drill.statusName,
    drill.productionOnly ? "production / latest release" : undefined
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "All defects";
}

export function QualityDashboard() {
  const { filter, applyHierarchy } = useFilters();
  const location = useLocation();
  const initialDrill = (location.state as { drill?: DefectDrillFilter } | null)?.drill ?? {};
  const [data, setData] = useState<QualityMetrics | null>(null);
  const [drill, setDrill] = useState<DefectDrillFilter>(initialDrill);
  const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
  const [defects, setDefects] = useState<DefectListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showMilestones, setShowMilestones] = useState(true);
  const [showLabels, setShowLabels] = useState({
    phase: true,
    daily: true,
    status: true,
    severity: true,
    age: true
  });
  const filterKey = `${filter.organization}|${filter.vertical}|${filter.product}|${filter.team}`;

  useEffect(() => {
    setSelectedRelease(null);
    setDrill((current) => {
      const next = { ...current };
      delete next.release;
      return next;
    });
  }, [filterKey]);

  const hasDrill = useMemo(
    () =>
      Boolean(
        drill.severity ||
          drill.phase ||
          drill.origin ||
          drill.ageBucket ||
          drill.status ||
          drill.statusName ||
          drill.productionOnly ||
          drill.release
      ),
    [drill]
  );

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void getQuality(filter, selectedRelease)
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
  }, [filter, selectedRelease]);

  useEffect(() => {
    if (!hasDrill) {
      setDefects([]);
      return;
    }
    let cancelled = false;
    void getQualityDefects(filter, drill)
      .then((result) => {
        if (!cancelled) {
          setDefects(result.defects);
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
  }, [filter, drill, hasDrill]);

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading quality…</p>;
  }

  const trail = hasDrill
    ? [
        { label: "All defects", onClick: () => setDrill({}) },
        { label: drillLabel(drill) }
      ]
    : undefined;

  const clearRelease = () => {
    setSelectedRelease(null);
    setDrill((current) => {
      const next = { ...current };
      delete next.release;
      return next;
    });
  };

  const selectRelease = (release: string | undefined, phase?: string) => {
    if (!release) {
      return;
    }
    setSelectedRelease(release);
    setDrill((current) => ({
      ...current,
      release,
      ...(phase ? { phase } : {})
    }));
  };

  const dailyTrend = data.dailyTrend.map((point, index, all) => ({
    ...point,
    closedBelow: -point.closed,
    backlogLabel: point.opened > 0 || point.closed > 0 || index === all.length - 1 ? point.openBacklog : null
  }));

  const milestoneLines = [...data.releaseMilestones]
    .reduce((groups, milestone) => {
      const current = groups.get(milestone.date) ?? { date: milestone.date, labels: [] as string[], key: milestone.key };
      current.labels.push(milestone.label);
      groups.set(milestone.date, current);
      return groups;
    }, new Map<string, { date: string; labels: string[]; key: string }>())
    .values();
  const milestoneMarkers = [...milestoneLines];

  const releaseTrail = selectedRelease
    ? [
        { label: "All releases", onClick: clearRelease },
        { label: selectedRelease }
      ]
    : [{ label: "All releases" }];

  const labelLink = (key: keyof typeof showLabels) => (
    <ChartLink onClick={() => setShowLabels((current) => ({ ...current, [key]: !current[key] }))}>
      {showLabels[key] ? "Hide data labels" : "Show data labels"}
    </ChartLink>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Quality</h1>
        <p className="mt-1 text-sm text-slate-500">
          No release is selected by default, so charts use the full defect set. Click a release to filter.
        </p>
      </div>
      <NotesList notes={data.notes} />
      <section className="grid gap-4 md:grid-cols-3">
        <button type="button" className="text-left" onClick={() => setDrill({ productionOnly: true })}>
          <MetricCard
            label="Defect Leakage"
            value={formatPercent(data.defectLeakage)}
            hint={selectedRelease ? `Production defects in ${selectedRelease}` : "Production defects across all releases"}
            trend={data.trends.defectLeakage}
            active={Boolean(drill.productionOnly)}
          />
        </button>
        <button type="button" className="text-left" onClick={() => setDrill(toggleField(drill, "status", "open"))}>
          <MetricCard
            label="Open Defects"
            value={String(data.openDefects)}
            hint={`${data.totalDefects} total defects in view`}
            active={drill.status === "open"}
          />
        </button>
        <button type="button" className="text-left" onClick={() => setDrill({ origin: "external" })}>
          <MetricCard
            label="Customer Defects"
            value={String(data.customerDefects)}
            hint="customer_reported = true"
            active={drill.origin === "external"}
          />
        </button>
      </section>

      <ChartCard
        title="Defects by Phase and DRE by Release"
        hint="Bars are defects found in each release, by phase. The line is defect removal efficiency. Click a release to filter; click a phase bar to list those defects."
        trail={releaseTrail}
        actions={labelLink("phase")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data.releasePhaseDre.map((row) => ({ release: row.release, dre: row.dre, ...row.counts }))}
            margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
            className="cursor-pointer"
            onClick={(state) => {
              const payload = state?.activePayload?.[0]?.payload as { release?: string } | undefined;
              const dataKey = state?.activePayload?.[0]?.dataKey;
              const phase = typeof dataKey === "string" && data.detectionPhases.includes(dataKey) ? dataKey : undefined;
              selectRelease(payload?.release, phase);
            }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="release" />
            <YAxis yAxisId="count" allowDecimals={false} />
            <YAxis yAxisId="dre" orientation="right" domain={[0, 100]} unit="%" />
            <Tooltip
              formatter={(value, name) => {
                const numeric = typeof value === "number" ? value : 0;
                if (name === "DRE") {
                  return [formatPercent(numeric), "DRE"];
                }
                return [numeric, String(name)];
              }}
            />
            <Legend />
            {data.detectionPhases.map((phase) => (
              <Bar
                isAnimationActive={false}
                key={phase}
                yAxisId="count"
                dataKey={phase}
                name={phase}
                fill={PHASE_BAR_COLORS[phase] ?? "#64748b"}
                radius={[3, 3, 0, 0]}
                label={chartLabel(showLabels.phase, { hideZero: true })}
              />
            ))}
            <Line
              isAnimationActive={false}
              yAxisId="dre"
              type="monotone"
              dataKey="dre"
              name="DRE"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              label={chartLabel(showLabels.phase, { suffix: "%" })}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`Open / Closure Daily Trend${selectedRelease ? ` · ${selectedRelease}` : " · All releases"}`}
        hint={
          selectedRelease
            ? "Created above the datum, closed below it. Vertical lines are release-plan milestones."
            : "Created above the datum, closed below it. The line is open defects. Click a release to show milestone markers."
        }
        footnote={
          showMilestones && selectedRelease && data.releaseMilestones.length > 0
            ? data.releaseMilestones.map((milestone) => `${milestone.label} ${milestone.date}`).join(" · ")
            : undefined
        }
        trail={releaseTrail}
        actions={
          <>
            {selectedRelease && data.releaseMilestones.length > 0 ? (
              <ChartLink onClick={() => setShowMilestones((value) => !value)}>
                {showMilestones ? "Hide milestones" : "Show milestones"}
              </ChartLink>
            ) : null}
            {labelLink("daily")}
          </>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dailyTrend} margin={{ top: 28, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="date" minTickGap={24} />
            <YAxis allowDecimals={false} />
            <ReferenceLine y={0} stroke="#0f172a" strokeWidth={1.5} />
            {showMilestones
              ? milestoneMarkers.map((marker) => (
                  <ReferenceLine
                    key={`${marker.date}-${marker.key}`}
                    x={marker.date}
                    stroke={MILESTONE_COLORS[marker.key] ?? "#7c3aed"}
                    strokeDasharray="5 3"
                    strokeWidth={1.75}
                    label={
                      <MilestoneLabel
                        text={marker.labels.join(" / ")}
                        fill={MILESTONE_COLORS[marker.key] ?? "#5b21b6"}
                      />
                    }
                  />
                ))
              : null}
            <Tooltip
              formatter={(value, name) => {
                const numeric = typeof value === "number" ? value : 0;
                if (name === "Closed") {
                  return [Math.abs(numeric), "Closed"];
                }
                return [numeric, String(name)];
              }}
            />
            <Legend />
            <Bar
              isAnimationActive={false}
              dataKey="opened"
              name="Created"
              fill="#64748b"
              radius={[2, 2, 0, 0]}
              label={chartLabel(showLabels.daily, { hideZero: true })}
            />
            <Bar
              isAnimationActive={false}
              dataKey="closedBelow"
              name="Closed"
              fill="#0d9488"
              radius={[0, 0, 2, 2]}
              label={chartLabel(showLabels.daily, { hideZero: true, abs: true, position: "bottom" })}
            />
            <Line
              isAnimationActive={false}
              type="monotone"
              dataKey="openBacklog"
              name="Open defects"
              stroke="#be123c"
              strokeWidth={2}
              dot={{ r: 2 }}
              label={chartLabel(showLabels.daily, { hideZero: true })}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Defects by Status"
        hint="Click a status to list those defects"
        trail={trail}
        actions={labelLink("status")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.byStatus}
            margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
            className="cursor-pointer"
            onClick={(state) => {
              const status = (state?.activePayload?.[0]?.payload as { status?: string } | undefined)?.status;
              if (status) {
                setDrill(toggleField(drill, "statusName", status));
              }
            }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              isAnimationActive={false}
              dataKey="count"
              name="Defects"
              fill="#334155"
              radius={[4, 4, 0, 0]}
              label={chartLabel(showLabels.status, { hideZero: true })}
            >
              {data.byStatus.map((entry) => (
                <Cell
                  key={entry.status}
                  fill="#334155"
                  opacity={!drill.statusName || drill.statusName === entry.status ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Defects by Severity"
        hint="Click a bar to list those defects"
        trail={trail}
        actions={labelLink("severity")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.bySeverity}
            margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
            className="cursor-pointer"
            onClick={(state) => {
              const key = (state?.activePayload?.[0]?.payload as { key?: string } | undefined)?.key;
              if (key) {
                setDrill(toggleField(drill, "severity", key));
              }
            }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              isAnimationActive={false}
              dataKey="count"
              name="Defects"
              radius={[4, 4, 0, 0]}
              label={chartLabel(showLabels.severity, { hideZero: true })}
            >
              {data.bySeverity.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={SEVERITY_COLORS[entry.key] ?? "#64748b"}
                  opacity={!drill.severity || drill.severity === entry.key ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Defects by Age"
        hint="Click a bucket to list those defects"
        footnote="Open defects use today − created date. Closed defects use resolved − created."
        trail={trail}
        actions={labelLink("age")}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.byAge}
            margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
            className="cursor-pointer"
            onClick={(state) => {
              const bucket = (state?.activePayload?.[0]?.payload as { bucket?: string } | undefined)?.bucket;
              if (bucket) {
                setDrill(toggleField(drill, "ageBucket", bucket));
              }
            }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="bucket" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar
              isAnimationActive={false}
              dataKey="count"
              name="Defects"
              fill="#155e75"
              radius={[4, 4, 0, 0]}
              label={chartLabel(showLabels.age, { hideZero: true })}
            >
              {data.byAge.map((entry) => (
                <Cell
                  key={entry.bucket}
                  fill="#155e75"
                  opacity={!drill.ageBucket || drill.ageBucket === entry.bucket ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {hasDrill ? (
        <DataTable<DefectListItem>
          empty="No defects match this drill-down."
          rowHint={`${defects.length} defect${defects.length === 1 ? "" : "s"} · ${drillLabel(drill)}. Click a row to filter to that team.`}
          rows={defects}
          onRowClick={applyHierarchy}
          columns={[
            { key: "id", label: "ID" },
            { key: "title", label: "Title" },
            { key: "team", label: "Team" },
            { key: "severity", label: "Severity" },
            { key: "detection_phase", label: "Phase" },
            { key: "status", label: "Status" },
            { key: "found_in_release", label: "Found in" },
            { key: "scheduled_for_release", label: "Scheduled for" },
            { key: "ageBucket", label: "Age" }
          ]}
        />
      ) : (
        <p className="text-sm text-slate-500">Select a chart bar or KPI to list the underlying defects.</p>
      )}
    </div>
  );
}
