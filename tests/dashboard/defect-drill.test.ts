import { describe, expect, it } from "vitest";
import { releaseDrill, setChartDrill, setCopqProduct, setCopqProductRelease, setCopqRelease, setCopqTeam } from "../../src/dashboard/defectDrill";

describe("defect drill", () => {
  it("keeps the release filter when drilling another chart", () => {
    expect(setChartDrill({ release: "R12", phase: "Development" }, "ageBucket", "0-7 days")).toEqual({
      release: "R12",
      ageBucket: "0-7 days"
    });
  });

  it("does not keep a previous phase when the same dimension is toggled off", () => {
    expect(setChartDrill({ release: "R12", origin: "external" }, "origin", "external")).toEqual({
      release: "R12"
    });
  });

  it("treats a release click as release-only unless a phase bar was clicked", () => {
    expect(releaseDrill("R12")).toEqual({ release: "R12" });
    expect(releaseDrill("R12", "Development")).toEqual({ release: "R12", phase: "Development" });
  });

  it("drills Visible COPQ from release to product over time to team", () => {
    expect(setCopqRelease("R12")).toEqual({ copqChart: true, copqRelease: "R12" });
    expect(setCopqProduct({ copqChart: true, copqRelease: "R12" }, "Checkout")).toEqual({
      copqChart: true,
      copqRelease: "R12",
      copqProduct: "Checkout",
      copqProductTrend: true
    });
    expect(
      setCopqProductRelease({ copqChart: true, copqRelease: "R12", copqProduct: "Checkout", copqProductTrend: true }, "R11")
    ).toEqual({
      copqChart: true,
      copqRelease: "R11",
      copqProduct: "Checkout"
    });
    expect(
      setCopqTeam({ copqChart: true, copqRelease: "R11", copqProduct: "Checkout" }, "Team Alpha")
    ).toEqual({
      copqChart: true,
      copqRelease: "R11",
      copqProduct: "Checkout",
      copqTeam: "Team Alpha",
      copq: true
    });
  });
});
