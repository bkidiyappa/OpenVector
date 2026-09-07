import { useEffect, useMemo, useRef, useState } from "react";
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
import type { CopqStackRow, DefectDrillFilter, DefectListItem, QualityMetrics } from "../../types";
import { getQuality, getQualityDefects } from "../api";
import { ChartCard, ChartLink } from "../components/ChartCard";
import { chartLabel } from "../components/ChartValueList";
import { DataTable } from "../components/DataTable";
import { MetricCard } from "../components/MetricCard";
import { NotesList } from "../components/NotesList";
import { useFilters } from "../FilterContext";
import {
  releaseDrill,
  setChartDrill,
  setCopqProduct,
  setCopqProductRelease,
  setCopqRelease,
  setCopqTeam
} from "../defectDrill";
import { chartCurrencyTooltipFormatter, chartTooltipFormatter, formatCurrency, formatPercent } from "../format";
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

const ORIGIN_COLORS: Record<string, string> = {
  internal: "#0f766e",
  external: "#be123c"
};

const ORIGIN_LABELS: Record<"internal" | "external", string> = {
  internal: "Internally Found",
  external: "Customer Found"
};

function toStackedBars(rows: CopqStackRow[]) {
  return rows.map((row) => ({
    ...row,
    ...Object.fromEntries(row.byPhase.map((bucket) => [bucket.phase, bucket.cost]))
  }));
}

function drillLabel(drill: DefectDrillFilter): string {
  const parts = [
    drill.release,
    drill.severity,
    drill.phase,
    drill.origin === "external" ? "Customer Found" : drill.origin === "internal" ? "Internally Found" : drill.origin,
    drill.ageBucket,
    drill.status,
    drill.statusName,
    drill.productionOnly ? "production / latest release" : undefined,
    drill.copq ? "Visible COPQ" : undefined,
    drill.copqRelease,
    drill.copqProduct,
    drill.copqTeam
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
  const phaseBarClick = useRef(false);
  const copqBarClick = useRef(false);
  const [showMilestones, setShowMilestones] = useState(true);
  const [showLabels, setShowLabels] = useState({
    phase: true,
    daily: true,
    status: true,
    severity: true,
    age: true,
    origin: true,
    copq: true
  });
  const filterKey = `${filter.organization}|${filter.vertical}|${filter.product}|${filter.team}`;

  useEffect(() => {
    setSelectedRelease(null);
    setDrill((current) => {
      const next = { ...current };
      delete next.release;
      delete next.copqChart;
      delete next.copqProductTrend;
      delete next.copqRelease;
      delete next.copqProduct;
      delete next.copqTeam;
      return next;
    });
  }, [filterKey]);

  const hasDrill = useMemo(() => {
    if (drill.copqChart && !drill.copqTeam) {
      return false;
    }
    return Boolean(
      drill.severity ||
        drill.phase ||
        drill.origin ||
        drill.ageBucket ||
        drill.status ||
        drill.statusName ||
        drill.productionOnly ||
        drill.release ||
        drill.copq ||
        drill.copqTeam
    );
  }, [drill]);

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
        {
          label: "All defects",
          onClick: () => setDrill(selectedRelease ? { release: selectedRelease } : {})
        },
        { label: drillLabel(drill) }
      ]
    : undefined;

  const clearRelease = () => {
    setSelectedRelease(null);
    setDrill((current) => {
      const next = { ...current };
      delete next.release;
      delete next.copqChart;
      delete next.copqProductTrend;
      delete next.copqRelease;
      delete next.copqProduct;
      delete next.copqTeam;
      return next;
    });
  };

  const selectRelease = (release: string | undefined, phase?: string) => {
    if (!release) {
      return;
    }
    setSelectedRelease(release);
    setDrill(releaseDrill(release, phase));
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

  const copqLevel: "releases" | "products" | "product-trend" | "teams" = !data.copq
    ? "releases"
    : drill.copqTeam
      ? "teams"
      : drill.copqProduct && drill.copqProductTrend
        ? "product-trend"
        : drill.copqProduct
          ? "teams"
          : drill.copqRelease
            ? "products"
            : "releases";

  const copqReleaseRow = data.copq?.byRelease.find((row) => row.release === drill.copqRelease);
  const copqProductRow = data.copq?.byProduct.find((row) => row.product === drill.copqProduct);
  const copqProductInRelease = copqReleaseRow?.products.find((row) => row.product === drill.copqProduct);
  const copqRows: CopqStackRow[] =
    copqLevel === "products"
      ? (copqReleaseRow?.products ?? [])
      : copqLevel === "product-trend"
        ? (copqProductRow?.byRelease ?? [])
        : copqLevel === "teams"
          ? (copqProductInRelease?.teams ?? [])
          : (data.copq?.byRelease ?? []);

  const resetCopqChart = () => setDrill(selectedRelease ? { release: selectedRelease } : {});

  const copqTrail = data.copq
    ? [
        {
          label: "All releases",
          onClick: drill.copqRelease || drill.copqProduct ? resetCopqChart : undefined
        },
        ...(drill.copqRelease
          ? [
              {
                label: drill.copqRelease,
                onClick:
                  drill.copqProduct || drill.copqTeam
                    ? () => setDrill(setCopqRelease(drill.copqRelease ?? ""))
                    : undefined
              }
            ]
          : []),
        ...(drill.copqProduct
          ? [
              {
                label: drill.copqProduct,
                onClick: drill.copqTeam
                  ? () => setDrill(setCopqProduct({ copqChart: true, copqRelease: drill.copqRelease }, drill.copqProduct ?? ""))
                  : undefined
              }
            ]
          : []),
        ...(drill.copqTeam ? [{ label: drill.copqTeam }] : []),
        ...(drill.phase && drill.copqChart ? [{ label: drill.phase }] : [])
      ]
    : undefined;

  const clickCopqRelease = (release?: string, phase?: string) => {
    if (!release || !data.copq) {
      return;
    }
    const row = data.copq.byRelease.find((entry) => entry.release === release);
    if (!row) {
      return;
    }
    if (row.products.length === 1) {
      const product = row.products[0];
      if (product.teams.length <= 1) {
        setDrill(
          setCopqTeam(
            { copqChart: true, copqRelease: release, copqProduct: product.product, phase },
            product.teams[0]?.team ?? product.product,
            phase
          )
        );
        return;
      }
      setDrill({ copqChart: true, copqRelease: release, copqProduct: product.product, phase });
      return;
    }
    setDrill(setCopqRelease(release, phase));
  };

  const clickCopqProduct = (product?: string, phase?: string) => {
    if (!product || !data.copq) {
      return;
    }
    const row = data.copq.byProduct.find((entry) => entry.product === product);
    if (!row) {
      return;
    }
    if (row.byRelease.length <= 1) {
      const release = drill.copqRelease ?? row.byRelease[0]?.key;
      const scoped = data.copq.byRelease.find((entry) => entry.release === release)?.products.find((entry) => entry.product === product);
      if (scoped && scoped.teams.length <= 1) {
        setDrill(
          setCopqTeam(
            { copqChart: true, copqRelease: release, copqProduct: product, phase },
            scoped.teams[0]?.team ?? product,
            phase
          )
        );
        return;
      }
      setDrill({ copqChart: true, copqRelease: release, copqProduct: product, phase });
      return;
    }
    setDrill(setCopqProduct({ copqChart: true, copqRelease: drill.copqRelease, phase }, product, phase));
  };

  const clickCopqProductRelease = (release?: string, phase?: string) => {
    if (!release || !drill.copqProduct || !data.copq) {
      return;
    }
    const scoped = data.copq.byRelease
      .find((entry) => entry.release === release)
      ?.products.find((entry) => entry.product === drill.copqProduct);
    if (scoped && scoped.teams.length <= 1) {
      setDrill(
        setCopqTeam(
          { copqChart: true, copqRelease: release, copqProduct: drill.copqProduct, phase },
          scoped.teams[0]?.team ?? drill.copqProduct,
          phase
        )
      );
      return;
    }
    setDrill(setCopqProductRelease({ ...drill, copqProduct: drill.copqProduct }, release, phase));
  };

  const clickCopqTeam = (team?: string, phase?: string) => {
    if (!team) {
      return;
    }
    setDrill(setCopqTeam(drill, team, phase));
  };

  const onCopqChartClick = (key?: string, phase?: string) => {
    if (!key) {
      return;
    }
    if (copqLevel === "releases") {
      clickCopqRelease(key, phase);
      return;
    }
    if (copqLevel === "products") {
      clickCopqProduct(key, phase);
      return;
    }
    if (copqLevel === "product-trend") {
      clickCopqProductRelease(key, phase);
      return;
    }
    clickCopqTeam(key, phase);
  };

  const copqTitle =
    copqLevel === "products"
      ? `Visible COPQ by Product · ${drill.copqRelease}`
      : copqLevel === "product-trend"
        ? `Visible COPQ · ${drill.copqProduct}`
        : copqLevel === "teams"
          ? `Visible COPQ by Team · ${drill.copqRelease} · ${drill.copqProduct}`
          : "Visible COPQ by Release";

  const copqHint =
    copqLevel === "products"
      ? "Stacked cost by detection phase for this release. Click a product to see its cost over releases."
      : copqLevel === "product-trend"
        ? "Cost of this product over releases, stacked by detection phase. Click a release to see teams."
        : copqLevel === "teams"
          ? "Stacked cost by detection phase. Click a team to list those defects."
          : "Cost by release, stacked by detection phase. Click a release to drill into products and teams.";

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
      <section className={`grid gap-4 ${data.copq ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
        <button type="button" className="text-left" onClick={() => setDrill(setChartDrill(drill, "productionOnly", true))}>
          <MetricCard
            label="Defect Leakage"
            value={formatPercent(data.defectLeakage)}
            hint={selectedRelease ? `Production defects in ${selectedRelease}` : "Production defects across all releases"}
            trend={data.trends.defectLeakage}
            active={Boolean(drill.productionOnly)}
          />
        </button>
        <button type="button" className="text-left" onClick={() => setDrill(setChartDrill(drill, "status", "open"))}>
          <MetricCard
            label="Open Defects"
            value={String(data.openDefects)}
            hint={`${data.totalDefects} total defects in view`}
            active={drill.status === "open"}
          />
        </button>
        <button type="button" className="text-left" onClick={() => setDrill(setChartDrill(drill, "origin", "external"))}>
          <MetricCard
            label="Customer Defects"
            value={String(data.customerDefects)}
            hint="customer_reported = true"
            active={drill.origin === "external"}
          />
        </button>
        {data.copq ? (
          <button type="button" className="text-left" onClick={() => setDrill(setChartDrill({ ...drill, copqChart: undefined }, "copq", true))}>
            <MetricCard
              label="Visible COPQ"
              value={formatCurrency(data.copq.total, data.copq.currency)}
              hint={
                selectedRelease
                  ? `Internal and external failure cost in ${selectedRelease}`
                  : "Internal and external failure cost in view"
              }
              trend={data.copq.trend}
              active={Boolean(drill.copq)}
            />
          </button>
        ) : null}
      </section>

      <ChartCard
        docId="phase-dre"
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
              if (phaseBarClick.current) {
                phaseBarClick.current = false;
                return;
              }
              const payload = state?.activePayload?.[0]?.payload as { release?: string } | undefined;
              selectRelease(payload?.release);
            }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="release" />
            <YAxis yAxisId="count" allowDecimals={false} />
            <YAxis yAxisId="dre" orientation="right" domain={[0, 100]} unit="%" />
            <Tooltip formatter={chartTooltipFormatter} />
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
                onClick={(entry) => {
                  phaseBarClick.current = true;
                  const row = entry as { release?: string; payload?: { release?: string } };
                  selectRelease(row.release ?? row.payload?.release, phase);
                }}
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
        docId="daily-trend"
        title={`Open / Closure Daily Trend${selectedRelease ? ` · ${selectedRelease}` : " · All releases"}`}
        hint={
          selectedRelease
            ? "Created above the datum, closed below it. Vertical lines are release-plan milestones."
            : "Created above the datum, closed below it. The line is open defects. Click a release to show milestone markers."
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
            <Tooltip formatter={chartTooltipFormatter} />
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

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          compact
          docId="status"
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
                  setDrill(setChartDrill(drill, "statusName", status));
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={chartTooltipFormatter} />
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
          compact
          docId="severity"
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
                  setDrill(setChartDrill(drill, "severity", key));
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={chartTooltipFormatter} />
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
          compact
          docId="age"
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
                  setDrill(setChartDrill(drill, "ageBucket", bucket));
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={chartTooltipFormatter} />
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

        <ChartCard
          compact
          docId="origin"
          title="Defects by Internally Found vs Customer Found"
          hint="Click a bar to list those defects"
          trail={trail}
          actions={labelLink("origin")}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.internalVsExternal.map((row) => ({
                ...row,
                label: ORIGIN_LABELS[row.key]
              }))}
              margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
              className="cursor-pointer"
              onClick={(state) => {
                const key = (state?.activePayload?.[0]?.payload as { key?: "internal" | "external" } | undefined)?.key;
                if (key) {
                  setDrill(setChartDrill(drill, "origin", key));
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" interval={0} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={chartTooltipFormatter} />
              <Bar
                isAnimationActive={false}
                dataKey="count"
                name="Defects"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels.origin, { hideZero: true })}
              >
                {data.internalVsExternal.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={ORIGIN_COLORS[entry.key] ?? "#64748b"}
                    opacity={!drill.origin || drill.origin === entry.key ? 1 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {data.copq ? (
        <ChartCard
          docId="copq-release"
          title={copqTitle}
          hint={copqHint}
          trail={copqTrail}
          actions={labelLink("copq")}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={toStackedBars(copqRows)}
              margin={{ top: 28, right: 8, left: 0, bottom: 0 }}
              className="cursor-pointer"
              onClick={(state) => {
                if (copqBarClick.current) {
                  copqBarClick.current = false;
                  return;
                }
                const payload = state?.activePayload?.[0]?.payload as { key?: string } | undefined;
                onCopqChartClick(payload?.key);
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" interval={0} tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={chartCurrencyTooltipFormatter(data.copq.currency)} />
              <Legend />
              {data.detectionPhases.map((phase) => (
                <Bar
                  isAnimationActive={false}
                  key={phase}
                  stackId="copq"
                  dataKey={phase}
                  name={phase}
                  fill={PHASE_BAR_COLORS[phase] ?? "#64748b"}
                  opacity={!drill.phase || drill.phase === phase ? 1 : 0.35}
                  label={chartLabel(showLabels.copq, { hideZero: true })}
                  onClick={(entry) => {
                    copqBarClick.current = true;
                    const row = entry as { key?: string; payload?: { key?: string } };
                    onCopqChartClick(row.key ?? row.payload?.key, phase);
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

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
            { key: "ageBucket", label: "Age" },
            ...(data.copq
              ? [
                  {
                    key: "estimatedCost" as const,
                    label: "Est. cost",
                    render: (row: DefectListItem) => formatCurrency(row.estimatedCost ?? null, data.copq?.currency)
                  }
                ]
              : [])
          ]}
        />
      ) : (
        <p className="text-sm text-slate-500">Select a chart bar or KPI to list the underlying defects.</p>
      )}
    </div>
  );
}
