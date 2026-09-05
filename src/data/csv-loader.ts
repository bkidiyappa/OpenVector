import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { z } from "zod";
import type { ValidationMessage } from "../types.js";

export type CsvLoadResult<T> = {
  rows: T[];
  messages: ValidationMessage[];
};

function formatZodIssue(issue: z.ZodIssue): string {
  const field = issue.path.join(".") || "row";
  return `${field}: ${issue.message}`;
}

export function missingColumnError(file: string, missing: string[], expected: readonly string[]): ValidationMessage {
  return {
    level: "error",
    file,
    message: [
      `Missing required column:`,
      `    ${missing.join(", ")}`,
      ``,
      `Expected columns:`,
      ...expected.map((column) => `    ${column}`)
    ].join("\n")
  };
}

export function loadCsvFile<T>(
  filePath: string,
  fileName: string,
  expectedColumns: readonly string[],
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  optional = false
): CsvLoadResult<T> {
  const messages: ValidationMessage[] = [];

  if (!existsSync(filePath)) {
    messages.push({
      level: optional ? "warning" : "error",
      file: fileName,
      message: optional
        ? `File not found. ${fileName} is optional; related metrics will be unavailable.`
        : `File not found at ${filePath}`
    });
    return { rows: [], messages };
  }

  const text = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim()
  });

  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      messages.push({
        level: "error",
        file: fileName,
        message: `Parse error on row ${error.row ?? "?"}: ${error.message}`
      });
    }
  }

  const headers = parsed.meta.fields ?? [];
  const missing = expectedColumns.filter((column) => !headers.includes(column));
  if (missing.length > 0) {
    messages.push(missingColumnError(fileName, missing, expectedColumns));
    return { rows: [], messages };
  }

  const extra = headers.filter((header) => header && !expectedColumns.includes(header));
  if (extra.length > 0) {
    messages.push({
      level: "warning",
      file: fileName,
      message: `Unexpected columns ignored: ${extra.join(", ")}`
    });
  }

  const rows: T[] = [];
  parsed.data.forEach((raw, index) => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      const details = result.error.issues.map(formatZodIssue).join("; ");
      messages.push({
        level: "error",
        file: fileName,
        message: `Row ${index + 2} rejected: ${details}`
      });
      return;
    }
    rows.push(result.data);
  });

  return { rows, messages };
}

export function csvPath(dataDir: string, fileName: string): string {
  return path.resolve(dataDir, fileName);
}
