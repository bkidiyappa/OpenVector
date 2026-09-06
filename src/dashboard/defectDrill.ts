import type { DefectDrillFilter } from "../types";

export function setChartDrill<K extends keyof DefectDrillFilter>(
  current: DefectDrillFilter,
  key: K,
  value: DefectDrillFilter[K]
): DefectDrillFilter {
  const next: DefectDrillFilter = {};
  if (current.release) {
    next.release = current.release;
  }
  if (current[key] === value) {
    return next;
  }
  next[key] = value;
  return next;
}

export function releaseDrill(release: string, phase?: string): DefectDrillFilter {
  return phase ? { release, phase } : { release };
}
