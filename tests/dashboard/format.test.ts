import { describe, expect, it } from "vitest";
import { chartTooltipFormatter, formatDecimal } from "../../src/dashboard/format";

describe("chart values", () => {
  it("rounds decimals to two places", () => {
    expect(formatDecimal(105.33333333333333)).toBe("105.33");
    expect(formatDecimal(7.523477622890683)).toBe("7.52");
    expect(formatDecimal(0.52)).toBe("0.52");
    expect(formatDecimal(139)).toBe("139");
  });

  it("formats tooltips the same way", () => {
    expect(chartTooltipFormatter(105.33333333333333, "6 Sprint Average")).toEqual(["105.33", "6 Sprint Average"]);
    expect(chartTooltipFormatter(7.523477622890683, "Score")).toEqual(["7.52", "Score"]);
    expect(chartTooltipFormatter(95.8333333, "DRE")).toEqual(["95.83%", "DRE"]);
    expect(chartTooltipFormatter(-2, "Closed")).toEqual(["2", "Closed"]);
  });
});
