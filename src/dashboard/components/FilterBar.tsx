import { useFilters } from "../FilterContext";
import { IconAspectLock, IconZoomIn, IconZoomOut } from "../icons";

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-[8.5rem] flex-1 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      <span className="shrink-0">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-ink-900 outline-none focus:border-teal-600"
      >
        <option value="All">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({
  zoom,
  aspectLock,
  onZoomIn,
  onZoomOut,
  onToggleAspectLock
}: {
  zoom: number;
  aspectLock: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleAspectLock: () => void;
}) {
  const { filter, options, setFilterValue } = useFilters();
  const active = [filter.organization, filter.vertical, filter.product, filter.team].filter(
    (value) => value && value !== "All"
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectField
        label="Org"
        value={filter.organization}
        options={options.organizations}
        onChange={(value) => setFilterValue("organization", value)}
      />
      <SelectField
        label="Vertical"
        value={filter.vertical}
        options={options.verticals}
        onChange={(value) => setFilterValue("vertical", value)}
      />
      <SelectField
        label="Product"
        value={filter.product}
        options={options.products}
        onChange={(value) => setFilterValue("product", value)}
      />
      <SelectField
        label="Team"
        value={filter.team}
        options={options.teams}
        onChange={(value) => setFilterValue("team", value)}
      />
      {active.length > 0 ? (
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50"
          onClick={() => {
            setFilterValue("organization", "All");
          }}
        >
          Reset
        </button>
      ) : null}
      <div className="ml-auto flex items-center gap-1" title="Chart size">
        <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:inline">
          Charts
        </span>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-ink-900 disabled:opacity-40"
          aria-label="Smaller charts"
          title="Smaller charts — see more in one view"
          disabled={zoom <= 50}
          onClick={onZoomOut}
        >
          <IconZoomOut className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-xs font-medium tabular-nums text-slate-600">{zoom}%</span>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-ink-900 disabled:opacity-40"
          aria-label="Larger charts"
          title="Larger charts"
          disabled={zoom >= 160}
          onClick={onZoomIn}
        >
          <IconZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
            aspectLock ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100 hover:text-ink-900"
          }`}
          aria-label={aspectLock ? "Unlock aspect ratio" : "Lock aspect ratio"}
          aria-pressed={aspectLock}
          title={
            aspectLock
              ? "Aspect ratio locked — width and height scale together"
              : "Lock aspect ratio — scale width with height"
          }
          onClick={onToggleAspectLock}
        >
          <IconAspectLock className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
