import type { ReactNode } from "react";

type TrailItem = {
  label: string;
  onClick?: () => void;
};

type ChartCardProps = {
  title: string;
  footnote?: string;
  hint?: string;
  trail?: TrailItem[];
  actions?: ReactNode;
  children: ReactNode;
};

export function ChartLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-teal-700 hover:underline">
      {children}
    </button>
  );
}

export function ChartCard({ title, footnote, hint, trail, actions, children }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {actions}
          {trail && trail.length > 0 ? (
            <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {trail.map((item, index) => (
                <span key={`${item.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {item.onClick ? (
                    <button type="button" onClick={item.onClick} className="font-medium text-teal-700 hover:underline">
                      {item.label}
                    </button>
                  ) : (
                    <span className="font-medium text-ink-900">{item.label}</span>
                  )}
                </span>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
      <div className="mt-4 h-96 overflow-visible">{children}</div>
      {footnote ? <p className="mt-3 text-sm text-slate-500">{footnote}</p> : null}
    </section>
  );
}
