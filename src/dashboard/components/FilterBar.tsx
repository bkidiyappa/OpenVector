import { useFilters } from "../FilterContext";

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

export function FilterBar() {
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
    </div>
  );
}
