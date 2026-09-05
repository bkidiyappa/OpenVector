import { NavLink, Outlet } from "react-router-dom";
import { FilterBar } from "./components/FilterBar";
import { useFilters } from "./FilterContext";

const LINKS = [
  { to: "/", label: "Overview" },
  { to: "/productivity", label: "Productivity" },
  { to: "/quality", label: "Quality" },
  { to: "/maturity", label: "Maturity" }
];

export function Dashboard() {
  const { messages } = useFilters();
  const errors = messages.filter((message) => message.level === "error");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="bg-ink-950 px-6 py-8 text-slate-200 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 font-mono text-sm font-semibold text-white">
            OV
          </span>
          <div>
            <p className="text-lg font-semibold text-white">OpenVector</p>
            <p className="text-xs text-slate-400">Engineering metrics</p>
          </div>
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="relative min-w-0">
        <div className="sticky top-3 z-30 mx-4 mt-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur">
          <FilterBar />
        </div>
        <main className="px-6 py-6">
          {errors.length > 0 ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">
              <p className="font-semibold">Data validation errors</p>
              <ul className="mt-2 space-y-2">
                {errors.map((error) => (
                  <li key={`${error.file}-${error.message}`} className="whitespace-pre-wrap">
                    <span className="font-mono">{error.file}</span>
                    {": "}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
