import type { ReleaseMilestone, ReleasePlanRow } from "../types.js";

export const RELEASE_MILESTONES = [
  { key: "dev_start", label: "Dev Start", field: "dev_start" },
  { key: "dev_complete", label: "Dev Complete", field: "dev_complete" },
  { key: "test_start", label: "Test Start", field: "test_start" },
  { key: "test_complete", label: "Test Complete", field: "test_complete" },
  { key: "prod_deployment", label: "Prod Deployment", field: "prod_deployment" }
] as const;

export const MILESTONE_COLORS: Record<string, string> = {
  dev_start: "#64748b",
  dev_complete: "#0f766e",
  test_start: "#0369a1",
  test_complete: "#7c3aed",
  prod_deployment: "#be123c"
};

export function calculateReleaseMilestones(plans: ReleasePlanRow[], release: string): ReleaseMilestone[] {
  const rows = plans.filter((plan) => plan.release === release);
  const milestones: ReleaseMilestone[] = [];

  for (const definition of RELEASE_MILESTONES) {
    const dated = rows
      .map((row) => ({ product: row.product, date: row[definition.field] }))
      .filter((row): row is { product: string; date: string } => Boolean(row.date));
    const dates = [...new Set(dated.map((row) => row.date))].sort((a, b) => a.localeCompare(b));

    for (const date of dates) {
      const products = dated.filter((row) => row.date === date).map((row) => row.product);
      milestones.push({
        key: definition.key,
        label: dates.length > 1 ? `${definition.label} (${[...new Set(products)].join(", ")})` : definition.label,
        date
      });
    }
  }

  return milestones.sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
}
