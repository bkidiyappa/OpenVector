import { describe, expect, it } from "vitest";
import { releaseDrill, setChartDrill } from "../../src/dashboard/defectDrill";

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
});
