import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type {
  CodeQualityBreakdown,
  CodeQualityMetrics,
  CoverageBreakdown,
  CoverageMetrics,
  MaturityMetrics,
  MaturityTeamBreakdown
} from "../../types";
import { getCodeQuality, getCoverage, getMaturity, getMaturityBreakdown } from "../api";
import { ChartCard, ChartLink } from "../components/ChartCard";
import { chartLabel } from "../components/ChartValueList";
import { DataTable } from "../components/DataTable";
import { MetricCard } from "../components/MetricCard";
import { NotesList } from "../components/NotesList";
import { useFilters } from "../FilterContext";
import { formatNumber, formatPercent } from "../format";

type TrendDrill = {
  date?: string;
  product?: string;
  module?: string;
};

const CHART_MARGIN = { top: 32, right: 8, left: 0, bottom: 0 };

function formatComponentValue(unit: string, value: number | null): string {
  if (value === null) {
    return "—";
  }
  if (unit === "%") {
    return formatPercent(value);
  }
  if (unit === "/10") {
    return `${formatNumber(value)} / 10`;
  }
  return formatNumber(value);
}

function drillTrail(drill: TrendDrill, onReset: () => void, onDate: () => void, onProduct: () => void) {
  const items = [{ label: "All dates", onClick: drill.date || drill.product || drill.module ? onReset : undefined }];
  if (drill.date) {
    items.push({
      label: drill.date,
      onClick: drill.product || drill.module ? onDate : undefined
    });
  }
  if (drill.product) {
    items.push({
      label: drill.product,
      onClick: drill.module ? onProduct : undefined
    });
  }
  if (drill.module) {
    items.push({ label: drill.module, onClick: undefined });
  }
  return items;
}

export function MaturityDashboard() {
  const { filter, applyHierarchy } = useFilters();
  const [data, setData] = useState<MaturityMetrics | null>(null);
  const [coverage, setCoverage] = useState<CoverageMetrics | null>(null);
  const [codeQuality, setCodeQuality] = useState<CodeQualityMetrics | null>(null);
  const [component, setComponent] = useState<string | null>(null);
  const [teams, setTeams] = useState<MaturityTeamBreakdown[]>([]);
  const [coverageDrill, setCoverageDrill] = useState<TrendDrill>({});
  const [qualityDrill, setQualityDrill] = useState<TrendDrill>({});
  const [error, setError] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState({ scores: true, coverage: true, quality: true });

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setComponent(null);
    setTeams([]);
    setCoverageDrill({});
    setQualityDrill({});
    void getMaturity(filter)
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

  useEffect(() => {
    let cancelled = false;
    void getCoverage(filter, coverageDrill)
      .then((result) => {
        if (!cancelled) {
          setCoverage(result);
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
  }, [filter, coverageDrill]);

  useEffect(() => {
    let cancelled = false;
    void getCodeQuality(filter, qualityDrill)
      .then((result) => {
        if (!cancelled) {
          setCodeQuality(result);
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
  }, [filter, qualityDrill]);

  useEffect(() => {
    if (!component) {
      setTeams([]);
      return;
    }
    let cancelled = false;
    void getMaturityBreakdown(filter, component)
      .then((result) => {
        if (!cancelled) {
          setTeams(result.teams);
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
  }, [filter, component]);

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }
  if (!data || !coverage || !codeQuality) {
    return <p className="text-sm text-slate-500">Loading maturity…</p>;
  }

  const selected = data.components.find((item) => item.key === component);
  const showCoverageBreakdown = Boolean(coverageDrill.date) && !coverageDrill.module;
  const showQualityBreakdown = Boolean(qualityDrill.date) && !qualityDrill.module;
  const labelLink = (key: keyof typeof showLabels) => (
    <ChartLink onClick={() => setShowLabels((current) => ({ ...current, [key]: !current[key] }))}>
      {showLabels[key] ? "Hide data labels" : "Show data labels"}
    </ChartLink>
  );

  const selectCoverageRow = (row: CoverageBreakdown | undefined) => {
    if (!row) {
      return;
    }
    if (row.level === "product") {
      setCoverageDrill((current) => ({ ...current, product: row.product, module: undefined }));
      return;
    }
    setCoverageDrill((current) => ({
      date: undefined,
      product: current.product ?? row.product,
      module: row.module
    }));
  };

  const selectQualityRow = (row: CodeQualityBreakdown | undefined) => {
    if (!row) {
      return;
    }
    if (row.level === "product") {
      setQualityDrill((current) => ({ ...current, product: row.product, module: undefined }));
      return;
    }
    setQualityDrill((current) => ({
      date: undefined,
      product: current.product ?? row.product,
      module: row.module
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Maturity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Click a component to see the latest value per team or module. Coverage and SonarQube quality have their own
          time trends — click a date, then a product or module.
        </p>
      </div>
      <NotesList notes={[...data.notes, ...coverage.notes, ...codeQuality.notes]} />
      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Quality Maturity"
          value={data.overall === null ? "—" : `${formatNumber(data.overall)} / 10`}
          hint={data.band}
          trend={data.trend}
        />
        <div className="grid grid-cols-2 gap-4">
          {data.components.map((item) => (
            <button key={item.key} type="button" className="text-left" onClick={() => setComponent(item.key)}>
              <MetricCard
                label={item.label}
                value={formatComponentValue(item.unit, item.value)}
                hint={item.score === null ? "No source data" : `Score ${formatNumber(item.score)} · Weight ${Math.round(item.weight * 100)}%`}
                active={component === item.key}
              />
            </button>
          ))}
        </div>
      </section>
      <ChartCard
        docId="normalized-scores"
        title="Normalized Scores"
        hint="Click a bar to drill into teams or modules"
        trail={
          selected
            ? [
                { label: "All components", onClick: () => setComponent(null) },
                { label: selected.label }
              ]
            : undefined
        }
        actions={labelLink("scores")}
      >
        <ResponsiveContainer width="100%" height="100%">
          {selected ? (
            <BarChart
              data={teams}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) => {
                const row = state?.activePayload?.[0]?.payload as MaturityTeamBreakdown | undefined;
                if (row) {
                  applyHierarchy({
                    organization: row.organization,
                    vertical: row.vertical,
                    product: row.product,
                    team: row.module ? undefined : row.team
                  });
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="team" />
              <YAxis />
              <Tooltip />
              <Bar
                isAnimationActive={false}
                dataKey="value"
                name={selected.label}
                fill="#0f766e"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels.scores, { suffix: selected.unit === "%" ? "%" : "" })}
              />
            </BarChart>
          ) : (
            <BarChart
              data={data.components.map((item) => ({ key: item.key, name: item.label, score: item.score ?? 0 }))}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) => {
                const key = (state?.activePayload?.[0]?.payload as { key?: string } | undefined)?.key;
                if (key) {
                  setComponent(key);
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Bar
                isAnimationActive={false}
                dataKey="score"
                name="Score"
                fill="#0f766e"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels.scores)}
              >
                {data.components.map((item) => (
                  <Cell key={item.key} fill="#0f766e" />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        docId="coverage-trend"
        title="Code Coverage Trend"
        hint={
          showCoverageBreakdown
            ? `Click a ${coverage.groupBy} to continue drilling.`
            : "Covered ÷ coverable lines. Click a date to see products or modules."
        }
        footnote={
          coverage.latest.coverage === null
            ? undefined
            : `Latest ${coverage.latest.date ?? ""}: ${coverage.latest.coveredLines.toLocaleString()} covered of ${coverage.latest.coverableLines.toLocaleString()} coverable (${coverage.latest.totalLines.toLocaleString()} total lines).`
        }
        trail={drillTrail(
          coverageDrill,
          () => setCoverageDrill({}),
          () => setCoverageDrill({ date: coverageDrill.date }),
          () => setCoverageDrill({ date: coverageDrill.date, product: coverageDrill.product })
        )}
        actions={labelLink("coverage")}
      >
        <ResponsiveContainer width="100%" height="100%">
          {showCoverageBreakdown ? (
            <BarChart
              data={coverage.breakdown}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) => selectCoverageRow(state?.activePayload?.[0]?.payload as CoverageBreakdown | undefined)}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(value, name) => {
                  const numeric = typeof value === "number" ? value : 0;
                  if (name === "Coverage") {
                    return [formatPercent(numeric), name];
                  }
                  return [numeric, String(name)];
                }}
              />
              <Bar
                isAnimationActive={false}
                dataKey="coverage"
                name="Coverage"
                fill="#0f766e"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels.coverage, { suffix: "%" })}
              />
            </BarChart>
          ) : (
            <LineChart
              data={coverage.trend}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) => {
                const date = (state?.activePayload?.[0]?.payload as { date?: string } | undefined)?.date;
                if (date) {
                  setCoverageDrill((current) => ({ ...current, date, module: undefined }));
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip
                formatter={(value, name) => {
                  const numeric = typeof value === "number" ? value : 0;
                  if (name === "Coverage") {
                    return [formatPercent(numeric), name];
                  }
                  return [numeric, String(name)];
                }}
              />
              <Legend />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="coverage"
                name="Coverage"
                stroke="#0f766e"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                label={chartLabel(showLabels.coverage, { suffix: "%" })}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </ChartCard>
      {showCoverageBreakdown ? (
        <DataTable<CoverageBreakdown>
          empty="No coverage rows for this date."
          rowHint={`Click a ${coverage.groupBy} to continue drilling.`}
          rows={coverage.breakdown}
          onRowClick={selectCoverageRow}
          columns={[
            { key: "label", label: coverage.groupBy === "product" ? "Product" : "Module" },
            { key: "coverage", label: "Coverage", render: (row) => formatPercent(row.coverage) },
            { key: "coveredLines", label: "Covered" },
            { key: "coverableLines", label: "Coverable" },
            { key: "totalLines", label: "Total lines" }
          ]}
        />
      ) : null}

      <ChartCard
        docId="quality-trend"
        title="Code Quality Trend"
        hint={
          showQualityBreakdown
            ? `Click a ${codeQuality.groupBy} to continue drilling.`
            : "SonarQube maintainability, security, and vulnerability (0–10). The score uses configured weights. Click a date to drill down."
        }
        footnote={`Weights: maintainability ${Math.round(codeQuality.weights.maintainability * 100)}%, security ${Math.round(codeQuality.weights.security * 100)}%, vulnerability ${Math.round(codeQuality.weights.vulnerability * 100)}%.`}
        trail={drillTrail(
          qualityDrill,
          () => setQualityDrill({}),
          () => setQualityDrill({ date: qualityDrill.date }),
          () => setQualityDrill({ date: qualityDrill.date, product: qualityDrill.product })
        )}
        actions={labelLink("quality")}
      >
        <ResponsiveContainer width="100%" height="100%">
          {showQualityBreakdown ? (
            <ComposedChart
              data={codeQuality.breakdown}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) =>
                selectQualityRow(state?.activePayload?.[0]?.payload as CodeQualityBreakdown | undefined)
              }
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 10]} />
              <Tooltip formatter={(value) => (typeof value === "number" ? formatNumber(value) : value)} />
              <Legend />
              <Bar
                isAnimationActive={false}
                dataKey="maintainability"
                name="Maintainability"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels.quality)}
              />
              <Bar
                isAnimationActive={false}
                dataKey="security"
                name="Security"
                fill="#0369a1"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels.quality)}
              />
              <Bar
                isAnimationActive={false}
                dataKey="vulnerability"
                name="Vulnerability"
                fill="#c2410c"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels.quality)}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="score"
                name="Score"
                stroke="#0f172a"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                label={chartLabel(showLabels.quality)}
              />
            </ComposedChart>
          ) : (
            <LineChart
              data={codeQuality.trend}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) => {
                const date = (state?.activePayload?.[0]?.payload as { date?: string } | undefined)?.date;
                if (date) {
                  setQualityDrill((current) => ({ ...current, date, module: undefined }));
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 10]} />
              <Tooltip formatter={(value) => (typeof value === "number" ? formatNumber(value) : value)} />
              <Legend />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="maintainability"
                name="Maintainability"
                stroke="#64748b"
                strokeWidth={2}
                dot={{ r: 3 }}
                label={chartLabel(showLabels.quality)}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="security"
                name="Security"
                stroke="#0369a1"
                strokeWidth={2}
                dot={{ r: 3 }}
                label={chartLabel(showLabels.quality)}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="vulnerability"
                name="Vulnerability"
                stroke="#c2410c"
                strokeWidth={2}
                dot={{ r: 3 }}
                label={chartLabel(showLabels.quality)}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="score"
                name="Score"
                stroke="#0f172a"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                label={chartLabel(showLabels.quality)}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </ChartCard>
      {showQualityBreakdown ? (
        <DataTable<CodeQualityBreakdown>
          empty="No code-quality rows for this date."
          rowHint={`Click a ${codeQuality.groupBy} to continue drilling.`}
          rows={codeQuality.breakdown}
          onRowClick={selectQualityRow}
          columns={[
            { key: "label", label: codeQuality.groupBy === "product" ? "Product" : "Module" },
            { key: "maintainability", label: "Maintainability", render: (row) => formatNumber(row.maintainability) },
            { key: "security", label: "Security", render: (row) => formatNumber(row.security) },
            { key: "vulnerability", label: "Vulnerability", render: (row) => formatNumber(row.vulnerability) },
            { key: "score", label: "Score", render: (row) => formatNumber(row.score) }
          ]}
        />
      ) : null}

      {selected ? (
        <DataTable<MaturityTeamBreakdown>
          empty="No values for this component."
          rowHint={
            selected.key === "codeCoverage" || selected.key === "codeQuality"
              ? "Click a module to filter to that product."
              : "Click a team to apply organization filters."
          }
          rows={teams}
          onRowClick={(row) =>
            applyHierarchy({
              organization: row.organization,
              vertical: row.vertical,
              product: row.product,
              team: row.module ? undefined : row.team
            })
          }
          columns={[
            { key: "team", label: selected.key === "codeCoverage" || selected.key === "codeQuality" ? "Module" : "Team" },
            { key: "value", label: "Value", render: (row) => formatComponentValue(row.unit, row.value) },
            { key: "score", label: "Score", render: (row) => formatNumber(row.score) },
            { key: "date", label: "As of", render: (row) => row.date ?? "—" }
          ]}
        />
      ) : (
        <DataTable
          empty="No maturity components."
          rows={data.components}
          columns={[
            { key: "label", label: "Metric" },
            { key: "value", label: "Value", render: (row) => formatComponentValue(row.unit, row.value) },
            { key: "score", label: "Score", render: (row) => formatNumber(row.score) },
            { key: "weight", label: "Weight", render: (row) => `${Math.round(row.weight * 100)}%` }
          ]}
        />
      )}
    </div>
  );
}
