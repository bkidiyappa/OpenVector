import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { ProductivityMetrics, SprintMetric, SprintTeamBreakdown } from "../../types";
import { getProductivity, getProductivityBreakdown } from "../api";
import { ChartCard, ChartLink } from "../components/ChartCard";
import { chartLabel } from "../components/ChartValueList";
import { DataTable } from "../components/DataTable";
import { MetricCard } from "../components/MetricCard";
import { NotesList } from "../components/NotesList";
import { useFilters } from "../FilterContext";
import { chartTooltipFormatter, formatNumber } from "../format";

type SelectedSprint = {
  sprint: string;
  endDate: string;
};

const CHART_MARGIN = { top: 32, right: 12, left: 0, bottom: 0 };

export function ProductivityDashboard() {
  const { filter, applyHierarchy } = useFilters();
  const [data, setData] = useState<ProductivityMetrics | null>(null);
  const [selected, setSelected] = useState<SelectedSprint | null>(null);
  const [teams, setTeams] = useState<SprintTeamBreakdown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setSelected(null);
    setTeams([]);
    void getProductivity(filter)
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
    if (!selected) {
      setTeams([]);
      return;
    }
    let cancelled = false;
    void getProductivityBreakdown(filter, selected.sprint, selected.endDate)
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
  }, [filter, selected]);

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading productivity…</p>;
  }

  const selectSprint = (sprint: SprintMetric | undefined) => {
    if (!sprint) {
      return;
    }
    setSelected({ sprint: sprint.sprint, endDate: sprint.endDate });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Productivity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Click a sprint to see team breakdown. Click a team to set the organization filter.
        </p>
      </div>
      <NotesList notes={data.notes} />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Available Capacity"
          value={formatNumber(data.latest.availableCapacity, " days")}
          hint={data.latest.sprint ?? "No sprint selected"}
        />
        <MetricCard
          label="Completed SP"
          value={formatNumber(data.latest.completedPoints)}
          hint="Latest sprint velocity"
          trend={data.trends.velocity}
        />
        <MetricCard
          label="SP / Capacity Day"
          value={formatNumber(data.latest.storyPointsPerCapacityDay)}
          hint="Completed story points ÷ available person-days"
          trend={data.trends.storyPointsPerCapacityDay}
        />
      </section>
      <ChartCard
        docId="velocity"
        title={selected ? `Velocity · Planned vs Completed · ${selected.sprint}` : "Velocity · Planned vs Completed"}
        hint={
          selected
            ? "Click a team bar to filter the dashboard to that team"
            : "Bars are planned and completed points. Lines are the moving average and SP / capacity day. Click a sprint to drill into teams."
        }
        footnote={
          selected
            ? "SP / capacity day uses the right axis."
            : `${data.usedWindow}-sprint moving average of completed story points. SP / capacity day uses the right axis.`
        }
        trail={
          selected
            ? [
                { label: "All sprints", onClick: () => setSelected(null) },
                { label: selected.sprint }
              ]
            : undefined
        }
        actions={
          <ChartLink onClick={() => setShowLabels((value) => !value)}>
            {showLabels ? "Hide data labels" : "Show data labels"}
          </ChartLink>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          {selected ? (
            <ComposedChart
              data={teams}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) => {
                const row = state?.activePayload?.[0]?.payload as SprintTeamBreakdown | undefined;
                if (row) {
                  applyHierarchy(row);
                }
              }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="team" />
              <YAxis yAxisId="points" />
              <YAxis yAxisId="perDay" orientation="right" />
              <Tooltip formatter={chartTooltipFormatter} />
              <Legend />
              <Bar
                isAnimationActive={false}
                yAxisId="points"
                dataKey="plannedPoints"
                name="Planned"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels)}
              />
              <Bar
                isAnimationActive={false}
                yAxisId="points"
                dataKey="completedPoints"
                name="Completed"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels)}
              />
              <Line
                isAnimationActive={false}
                yAxisId="perDay"
                type="monotone"
                dataKey="storyPointsPerCapacityDay"
                name="SP / Capacity Day"
                stroke="#be123c"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                label={chartLabel(showLabels)}
              />
            </ComposedChart>
          ) : (
            <ComposedChart
              data={data.sprints}
              margin={CHART_MARGIN}
              className="cursor-pointer"
              onClick={(state) => selectSprint(state?.activePayload?.[0]?.payload as SprintMetric | undefined)}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="sprint" />
              <YAxis yAxisId="points" />
              <YAxis yAxisId="perDay" orientation="right" />
              <Tooltip formatter={chartTooltipFormatter} />
              <Legend />
              <Bar
                isAnimationActive={false}
                yAxisId="points"
                dataKey="plannedPoints"
                name="Planned"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels)}
              />
              <Bar
                isAnimationActive={false}
                yAxisId="points"
                dataKey="completedPoints"
                name="Completed"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
                label={chartLabel(showLabels)}
              />
              <Line
                isAnimationActive={false}
                yAxisId="points"
                type="monotone"
                dataKey="movingAverage"
                name={`${data.movingAverageWindow} Sprint Average`}
                stroke="#334155"
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
                label={chartLabel(showLabels)}
              />
              <Line
                isAnimationActive={false}
                yAxisId="perDay"
                type="monotone"
                dataKey="storyPointsPerCapacityDay"
                name="SP / Capacity Day"
                stroke="#be123c"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                label={chartLabel(showLabels)}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </ChartCard>
      {selected ? (
        <DataTable<SprintTeamBreakdown>
          empty="No team rows for this sprint."
          rowHint="Click a team to apply Organization → Vertical → Product → Team filters."
          rows={teams}
          onRowClick={applyHierarchy}
          columns={[
            { key: "team", label: "Team" },
            { key: "plannedPoints", label: "Planned SP" },
            { key: "completedPoints", label: "Completed SP" },
            { key: "availableCapacity", label: "Available Capacity" },
            {
              key: "storyPointsPerCapacityDay",
              label: "SP / Capacity Day",
              render: (row) => formatNumber(row.storyPointsPerCapacityDay)
            }
          ]}
        />
      ) : (
        <DataTable<SprintMetric>
          empty="No sprint rows to display."
          rowHint="Click a sprint row to drill into teams."
          rows={data.sprints}
          onRowClick={selectSprint}
          columns={[
            { key: "sprint", label: "Sprint" },
            { key: "plannedPoints", label: "Planned SP" },
            { key: "completedPoints", label: "Completed SP" },
            { key: "availableCapacity", label: "Available Capacity" },
            { key: "velocity", label: "Velocity" },
            {
              key: "storyPointsPerCapacityDay",
              label: "SP / Capacity Day",
              render: (row) => formatNumber(row.storyPointsPerCapacityDay)
            }
          ]}
        />
      )}
    </div>
  );
}
