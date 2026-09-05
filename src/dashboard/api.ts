import type {
  CodeQualityMetrics,
  CoverageMetrics,
  DefectDrillFilter,
  DefectListItem,
  FilterOptions,
  MaturityMetrics,
  MaturityTeamBreakdown,
  OrgFilter,
  OverviewMetrics,
  ProductivityMetrics,
  QualityMetrics,
  SprintTeamBreakdown,
  ValidationMessage
} from "../types";

export type FilterState = {
  organization: string;
  vertical: string;
  product: string;
  team: string;
};

function queryString(filter: FilterState): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value && value !== "All") {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function getConfig() {
  return fetchJson<{
    movingAverageWindow: number;
    organizationEnabled: boolean;
    defaults: FilterState;
  }>("/api/config");
}

export async function getValidation() {
  return fetchJson<{ messages: ValidationMessage[] }>("/api/validation");
}

export async function getFilters(filter: FilterState) {
  return fetchJson<{ filter: OrgFilter; options: FilterOptions }>(`/api/filters${queryString(filter)}`);
}

export async function getOverview(filter: FilterState) {
  return fetchJson<OverviewMetrics>(`/api/overview${queryString(filter)}`);
}

export async function getProductivity(filter: FilterState) {
  return fetchJson<ProductivityMetrics>(`/api/productivity${queryString(filter)}`);
}

export async function getQuality(filter: FilterState, release?: string | null) {
  return fetchJson<QualityMetrics>(`/api/quality${withExtra(filter, { release: release ?? undefined })}`);
}

export async function getMaturity(filter: FilterState) {
  return fetchJson<MaturityMetrics>(`/api/maturity${queryString(filter)}`);
}

function withExtra(filter: FilterState, extra: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value && value !== "All") {
      params.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getProductivityBreakdown(filter: FilterState, sprint: string, endDate?: string) {
  return fetchJson<{ sprint: string; endDate: string | null; teams: SprintTeamBreakdown[] }>(
    `/api/productivity/breakdown${withExtra(filter, { sprint, endDate })}`
  );
}

export async function getQualityDefects(filter: FilterState, drill: DefectDrillFilter) {
  return fetchJson<{ drill: DefectDrillFilter; defects: DefectListItem[] }>(
    `/api/quality/defects${withExtra(filter, {
      severity: drill.severity,
      phase: drill.phase,
      origin: drill.origin,
      ageBucket: drill.ageBucket,
      status: drill.status,
      statusName: drill.statusName,
      release: drill.release,
      productionOnly: drill.productionOnly ? "true" : undefined
    })}`
  );
}

export async function getMaturityBreakdown(filter: FilterState, component: string) {
  return fetchJson<{ component: string; teams: MaturityTeamBreakdown[] }>(
    `/api/maturity/breakdown${withExtra(filter, { component })}`
  );
}

type TrendQuery = {
  date?: string;
  product?: string;
  module?: string;
};

export async function getCoverage(filter: FilterState, query: TrendQuery = {}) {
  return fetchJson<CoverageMetrics>(
    `/api/coverage${withExtra(filter, { date: query.date, product: query.product ?? filter.product, module: query.module })}`
  );
}

export async function getCodeQuality(filter: FilterState, query: TrendQuery = {}) {
  return fetchJson<CodeQualityMetrics>(
    `/api/code-quality${withExtra(
      filter,
      { date: query.date, product: query.product ?? filter.product, module: query.module }
    )}`
  );
}
