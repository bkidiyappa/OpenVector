import { describe, expect, it } from "vitest";
import { calculateCodeQualityMetrics, weightedQualityScore } from "../../src/metrics/code-quality";
import type { CodeQualityRow } from "../../src/types";

const weights = { maintainability: 0.4, security: 0.3, vulnerability: 0.3 };

const rows: CodeQualityRow[] = [
  {
    organization: "Acme",
    vertical: "Payments",
    product: "Checkout",
    module: "checkout-api",
    date: "2026-08-11",
    maintainability: 8.0,
    security: 8.0,
    vulnerability: 8.0
  },
  {
    organization: "Acme",
    vertical: "Payments",
    product: "Checkout",
    module: "checkout-api",
    date: "2026-08-25",
    maintainability: 8.4,
    security: 8.6,
    vulnerability: 8.2
  },
  {
    organization: "Acme",
    vertical: "Travel",
    product: "Booking",
    module: "booking-api",
    date: "2026-08-25",
    maintainability: 7.0,
    security: 7.0,
    vulnerability: 7.0
  }
];

describe("SonarQube code quality", () => {
  it("computes a weighted score from the three ratings", () => {
    expect(weightedQualityScore(8.4, 8.6, 8.2, weights)).toBeCloseTo(8.4);
  });

  it("averages dimensions on a date then applies weights", () => {
    const result = calculateCodeQualityMetrics(rows, weights);
    expect(result.latest.maintainability).toBeCloseTo(7.7);
    expect(result.latest.score).not.toBeNull();
    expect(result.trend).toHaveLength(2);
  });

  it("breaks a date down by product when more than one product is present", () => {
    const result = calculateCodeQualityMetrics(rows, weights, "2026-08-25");
    expect(result.groupBy).toBe("product");
    expect(result.breakdown).toHaveLength(2);
  });
});
