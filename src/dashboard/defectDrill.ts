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

export function setCopqRelease(release: string, phase?: string): DefectDrillFilter {
  return phase
    ? { copqChart: true, copqRelease: release, phase }
    : { copqChart: true, copqRelease: release };
}

export function setCopqProduct(current: DefectDrillFilter, product: string, phase?: string): DefectDrillFilter {
  const next: DefectDrillFilter = {
    copqChart: true,
    copqRelease: current.copqRelease,
    copqProduct: product,
    copqProductTrend: true
  };
  const nextPhase = phase ?? current.phase;
  if (nextPhase) {
    next.phase = nextPhase;
  }
  return next;
}

export function setCopqProductRelease(
  current: DefectDrillFilter,
  release: string,
  phase?: string
): DefectDrillFilter {
  const next: DefectDrillFilter = {
    copqChart: true,
    copqRelease: release,
    copqProduct: current.copqProduct
  };
  const nextPhase = phase ?? current.phase;
  if (nextPhase) {
    next.phase = nextPhase;
  }
  return next;
}

export function setCopqTeam(current: DefectDrillFilter, team: string, phase?: string): DefectDrillFilter {
  const next: DefectDrillFilter = {
    copqChart: true,
    copqRelease: current.copqRelease,
    copqProduct: current.copqProduct,
    copqTeam: team,
    copq: true
  };
  const nextPhase = phase ?? current.phase;
  if (nextPhase) {
    next.phase = nextPhase;
  }
  return next;
}
