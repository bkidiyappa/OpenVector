import { describe, expect, it } from "vitest";
import { missingColumnError } from "../../src/data/csv-loader";
import { DEFECT_COLUMNS } from "../../src/data/schemas";

describe("CSV validation", () => {
  it("lists missing and expected columns without inventing rows", () => {
    const error = missingColumnError("defects.csv", ["severity"], DEFECT_COLUMNS);
    expect(error.level).toBe("error");
    expect(error.message).toContain("Missing required column:");
    expect(error.message).toContain("severity");
    expect(error.message).toContain("created_date");
  });
});
