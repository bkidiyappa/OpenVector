import path from "node:path";
import type { AppConfig, LoadedData, OrgFilter, ValidationMessage } from "../types.js";
import {
  AUTOMATION_COLUMNS,
  CODE_COVERAGE_COLUMNS,
  CODE_QUALITY_COLUMNS,
  DEFECT_COLUMNS,
  RELEASE_PLAN_COLUMNS,
  SPRINT_COLUMNS,
  TEAM_COLUMNS,
  automationRowSchema,
  codeCoverageRowSchema,
  codeQualityRowSchema,
  defectRowSchema,
  releasePlanRowSchema,
  sprintRowSchema,
  teamRowSchema
} from "./schemas.js";
import { csvPath, loadCsvFile } from "./csv-loader.js";
import { applyFilter, buildFilterOptions } from "../metrics/filters.js";

export function loadAllData(config: AppConfig, cwd = process.cwd()): LoadedData {
  const dataDir = path.resolve(cwd, config.data.path);
  const messages: ValidationMessage[] = [];

  const teams = loadCsvFile(csvPath(dataDir, "teams.csv"), "teams.csv", TEAM_COLUMNS, teamRowSchema);
  const sprints = loadCsvFile(csvPath(dataDir, "sprints.csv"), "sprints.csv", SPRINT_COLUMNS, sprintRowSchema);
  const defects = loadCsvFile(csvPath(dataDir, "defects.csv"), "defects.csv", DEFECT_COLUMNS, defectRowSchema);
  const automation = loadCsvFile(
    csvPath(dataDir, "automation.csv"),
    "automation.csv",
    AUTOMATION_COLUMNS,
    automationRowSchema,
    true
  );
  const codeCoverage = loadCsvFile(
    csvPath(dataDir, "code-coverage.csv"),
    "code-coverage.csv",
    CODE_COVERAGE_COLUMNS,
    codeCoverageRowSchema,
    true
  );
  const codeQuality = loadCsvFile(
    csvPath(dataDir, "code-quality.csv"),
    "code-quality.csv",
    CODE_QUALITY_COLUMNS,
    codeQualityRowSchema,
    true
  );
  const releasePlans = loadCsvFile(
    csvPath(dataDir, "release-plan.csv"),
    "release-plan.csv",
    RELEASE_PLAN_COLUMNS,
    releasePlanRowSchema,
    true
  );

  messages.push(
    ...teams.messages,
    ...sprints.messages,
    ...defects.messages,
    ...automation.messages,
    ...codeCoverage.messages,
    ...codeQuality.messages,
    ...releasePlans.messages
  );

  const loaded: LoadedData = {
    teams: teams.rows,
    sprints: sprints.rows,
    defects: defects.rows.map((row) => ({
      ...row,
      detection_phase: config.phaseAliases[row.detection_phase] ?? row.detection_phase
    })),
    automation: automation.rows,
    codeCoverage: codeCoverage.rows,
    codeQuality: codeQuality.rows,
    releasePlans: releasePlans.rows,
    messages
  };

  return loaded;
}

export function filterData(data: LoadedData, filter: OrgFilter): Omit<LoadedData, "messages"> {
  return {
    teams: applyFilter(data.teams, filter),
    sprints: applyFilter(data.sprints, filter),
    defects: applyFilter(data.defects, filter),
    automation: applyFilter(data.automation, filter),
    codeCoverage: applyFilter(data.codeCoverage, filter),
    codeQuality: applyFilter(data.codeQuality, filter),
    releasePlans: applyFilter(data.releasePlans, filter)
  };
}

export function getFilterOptions(data: LoadedData, filter: OrgFilter) {
  return buildFilterOptions(
    [
      ...data.teams,
      ...data.sprints,
      ...data.defects,
      ...data.automation,
      ...data.codeCoverage,
      ...data.codeQuality,
      ...data.releasePlans
    ],
    filter
  );
}

export function formatStartupMessages(messages: ValidationMessage[]): string {
  return messages
    .map((message) => {
      const prefix = message.level === "error" ? "ERROR" : "WARNING";
      return `${prefix}: ${message.file}\n\n${message.message}`;
    })
    .join("\n\n");
}
