import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const optionalIsoDate = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Date must be YYYY-MM-DD")
  .transform((value) => (value === "" ? null : value));

const booleanFlag = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => ["true", "false", "1", "0", "yes", "no"].includes(value), "Must be true or false")
  .transform((value) => ["true", "1", "yes"].includes(value));

export const TEAM_COLUMNS = ["organization", "vertical", "product", "team", "member_count"] as const;
export const SPRINT_COLUMNS = [
  "organization",
  "vertical",
  "product",
  "team",
  "sprint",
  "start_date",
  "end_date",
  "team_size",
  "working_days",
  "holiday_days",
  "leave_days",
  "planned_points",
  "completed_points"
] as const;
export const DEFECT_COLUMNS = [
  "id",
  "organization",
  "vertical",
  "product",
  "team",
  "title",
  "severity",
  "created_date",
  "detected_date",
  "resolved_date",
  "detection_phase",
  "customer_reported",
  "found_in_release",
  "scheduled_for_release",
  "status"
] as const;
export const AUTOMATION_COLUMNS = [
  "organization",
  "vertical",
  "product",
  "team",
  "date",
  "automation_coverage"
] as const;
export const CODE_COVERAGE_COLUMNS = [
  "organization",
  "vertical",
  "product",
  "module",
  "date",
  "total_lines",
  "coverable_lines",
  "covered_lines"
] as const;
export const RELEASE_PLAN_COLUMNS = [
  "organization",
  "vertical",
  "product",
  "release",
  "dev_start",
  "dev_complete",
  "test_start",
  "test_complete",
  "prod_deployment"
] as const;
export const CODE_QUALITY_COLUMNS = [
  "organization",
  "vertical",
  "product",
  "module",
  "date",
  "maintainability",
  "security",
  "vulnerability"
] as const;

export const teamRowSchema = z.object({
  organization: z.string().trim().min(1),
  vertical: z.string().trim().min(1),
  product: z.string().trim().min(1),
  team: z.string().trim().min(1),
  member_count: z.coerce.number().int().nonnegative()
});

export const sprintRowSchema = z.object({
  organization: z.string().trim().min(1),
  vertical: z.string().trim().min(1),
  product: z.string().trim().min(1),
  team: z.string().trim().min(1),
  sprint: z.string().trim().min(1),
  start_date: isoDate,
  end_date: isoDate,
  team_size: z.coerce.number().int().positive(),
  working_days: z.coerce.number().nonnegative(),
  holiday_days: z.coerce.number().nonnegative(),
  leave_days: z.coerce.number().nonnegative(),
  planned_points: z.coerce.number().nonnegative(),
  completed_points: z.coerce.number().nonnegative()
});

export const defectRowSchema = z.object({
  id: z.string().trim().min(1),
  organization: z.string().trim().min(1),
  vertical: z.string().trim().min(1),
  product: z.string().trim().min(1),
  team: z.string().trim().min(1),
  title: z.string().trim().min(1),
  severity: z.string().trim().min(1),
  created_date: isoDate,
  detected_date: optionalIsoDate,
  resolved_date: optionalIsoDate,
  detection_phase: z.string().trim().min(1),
  customer_reported: booleanFlag,
  found_in_release: z.string().trim().min(1),
  scheduled_for_release: z.string().trim().min(1),
  status: z.string().trim().min(1)
});

export const automationRowSchema = z.object({
  organization: z.string().trim().min(1),
  vertical: z.string().trim().min(1),
  product: z.string().trim().min(1),
  team: z.string().trim().min(1),
  date: isoDate,
  automation_coverage: z.coerce.number().min(0).max(100)
});

export const codeCoverageRowSchema = z.object({
  organization: z.string().trim().min(1),
  vertical: z.string().trim().min(1),
  product: z.string().trim().min(1),
  module: z.string().trim().min(1),
  date: isoDate,
  total_lines: z.coerce.number().int().nonnegative(),
  coverable_lines: z.coerce.number().int().nonnegative(),
  covered_lines: z.coerce.number().int().nonnegative()
});

export const releasePlanRowSchema = z.object({
  organization: z.string().trim().min(1),
  vertical: z.string().trim().min(1),
  product: z.string().trim().min(1),
  release: z.string().trim().min(1),
  dev_start: optionalIsoDate,
  dev_complete: optionalIsoDate,
  test_start: optionalIsoDate,
  test_complete: optionalIsoDate,
  prod_deployment: optionalIsoDate
});

export const codeQualityRowSchema = z.object({
  organization: z.string().trim().min(1),
  vertical: z.string().trim().min(1),
  product: z.string().trim().min(1),
  module: z.string().trim().min(1),
  date: isoDate,
  maintainability: z.coerce.number().min(0).max(10),
  security: z.coerce.number().min(0).max(10),
  vulnerability: z.coerce.number().min(0).max(10)
});
