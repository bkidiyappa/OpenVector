import { useEffect, useState, type CSSProperties } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FilterBar } from "./components/FilterBar";
import { useFilters } from "./FilterContext";
import {
  IconChevronLeft,
  IconChevronRight,
  IconMaturity,
  IconOverview,
  IconProductivity,
  IconQuality
} from "./icons";

const LINKS = [
  { to: "/", label: "Overview", icon: IconOverview },
  { to: "/productivity", label: "Productivity", icon: IconProductivity },
  { to: "/quality", label: "Quality", icon: IconQuality },
  { to: "/maturity", label: "Maturity", icon: IconMaturity }
];

const ZOOM_MIN = 50;
const ZOOM_MAX = 160;
const ZOOM_STEP = 10;
const SIDEBAR_KEY = "openvector.sidebar";
const ZOOM_KEY = "openvector.zoom";
const ASPECT_KEY = "openvector.aspectLock";

function readStoredZoom(): number {
  const stored = window.localStorage.getItem(ZOOM_KEY);
  const raw = Number(stored);
  if (!stored || !Number.isFinite(raw)) {
    return 100;
  }
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, raw));
}

export function Dashboard() {
  const { messages } = useFilters();
  const errors = messages.filter((message) => message.level === "error");
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(SIDEBAR_KEY) === "collapsed");
  const [zoom, setZoom] = useState(readStoredZoom);
  const [aspectLock, setAspectLock] = useState(() => window.localStorage.getItem(ASPECT_KEY) === "on");

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(ZOOM_KEY, String(zoom));
  }, [zoom]);

  useEffect(() => {
    window.localStorage.setItem(ASPECT_KEY, aspectLock ? "on" : "off");
  }, [aspectLock]);

  return (
    <div className={`min-h-screen lg:grid ${collapsed ? "lg:grid-cols-[4.5rem_1fr]" : "lg:grid-cols-[16rem_1fr]"}`}>
      <aside
        className={`bg-ink-950 text-slate-200 lg:sticky lg:top-0 lg:h-screen ${
          collapsed ? "px-2 py-4" : "px-6 py-8"
        }`}
      >
        <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between gap-3"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-700 font-mono text-sm font-semibold text-white">
              OV
            </span>
            {collapsed ? null : (
              <div>
                <p className="text-lg font-semibold text-white">OpenVector</p>
                <p className="text-xs text-slate-400">Engineering metrics</p>
              </div>
            )}
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <IconChevronRight className="h-4 w-4" /> : <IconChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className={`mt-8 flex gap-1 ${collapsed ? "flex-row justify-center lg:flex-col" : "flex-col"}`}>
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                title={link.label}
                aria-label={link.label}
                className={({ isActive }) =>
                  `flex items-center rounded-lg text-sm font-medium ${
                    collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
                  } ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {collapsed ? <span className="sr-only">{link.label}</span> : link.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="relative min-w-0">
        <div className="sticky top-3 z-30 mx-4 mt-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur">
          <FilterBar
            zoom={zoom}
            aspectLock={aspectLock}
            onZoomIn={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
            onZoomOut={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
            onToggleAspectLock={() => setAspectLock((value) => !value)}
          />
        </div>
        <main
          className="px-6 py-6"
          style={
            {
              "--chart-height": `${(24 * zoom) / 100}rem`,
              "--chart-compact-height": `${(18 * zoom) / 100}rem`,
              "--chart-scale": String(zoom / 100),
              "--chart-width": aspectLock ? `${zoom}%` : "100%"
            } as CSSProperties
          }
        >
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
