import type { OrgFilter } from "../types.js";

type HierarchicalRow = {
  organization: string;
  vertical: string;
  product: string;
  team?: string;
  module?: string;
};

export function isAll(value: string | undefined): boolean {
  return !value || value === "All";
}

export function matchesFilter(row: HierarchicalRow, filter: OrgFilter): boolean {
  if (!isAll(filter.organization) && row.organization !== filter.organization) {
    return false;
  }
  if (!isAll(filter.vertical) && row.vertical !== filter.vertical) {
    return false;
  }
  if (!isAll(filter.product) && row.product !== filter.product) {
    return false;
  }
  if (!isAll(filter.team) && row.team !== undefined && row.team !== filter.team) {
    return false;
  }
  if (!isAll(filter.module) && row.module !== undefined && row.module !== filter.module) {
    return false;
  }
  return true;
}

export function applyFilter<T extends HierarchicalRow>(rows: T[], filter: OrgFilter): T[] {
  return rows.filter((row) => matchesFilter(row, filter));
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function buildFilterOptions(rows: HierarchicalRow[], filter: OrgFilter) {
  const organizations = uniqueSorted(rows.map((row) => row.organization));
  const afterOrg = rows.filter((row) => isAll(filter.organization) || row.organization === filter.organization);
  const verticals = uniqueSorted(afterOrg.map((row) => row.vertical));
  const afterVertical = afterOrg.filter((row) => isAll(filter.vertical) || row.vertical === filter.vertical);
  const products = uniqueSorted(afterVertical.map((row) => row.product));
  const afterProduct = afterVertical.filter((row) => isAll(filter.product) || row.product === filter.product);
  const teams = uniqueSorted(afterProduct.map((row) => row.team).filter((team): team is string => Boolean(team)));

  return { organizations, verticals, products, teams };
}
