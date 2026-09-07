import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { AppConfig, MaturityBand } from "./types.js";

const DEFAULT_CONFIG: AppConfig = {
  data: { path: "./data" },
  metrics: { velocityMovingAverage: 6 },
  organization: { enabled: true },
  filters: {
    organization: "All",
    vertical: "All",
    product: "All",
    team: "All"
  },
  severity: {
    critical: ["Sev1", "Critical"],
    high: ["Sev2", "High"],
    medium: ["Sev3", "Medium"],
    low: ["Sev4", "Low"]
  },
  detectionPhases: ["Development", "System Testing", "UAT", "Production"],
  productionPhases: ["Production"],
  phaseAliases: {
    Requirements: "Development",
    "Unit Testing": "Development",
    "Integration Testing": "System Testing",
    "System Test": "System Testing"
  },
  closedStatuses: ["Closed", "Resolved", "Done"],
  ageBuckets: [
    { label: "0–7 days", min: 0, max: 7 },
    { label: "8–14 days", min: 8, max: 14 },
    { label: "15–30 days", min: 15, max: 30 },
    { label: "31–60 days", min: 31, max: 60 },
    { label: "61–90 days", min: 61, max: 90 },
    { label: ">90 days", min: 91, max: null }
  ],
  maturity: {
    weights: {
      automationCoverage: 0.25,
      codeCoverage: 0.25,
      codeQuality: 0.25,
      defectLeakage: 0.25
    },
    leakageZeroScoreAt: 21,
    bands: [
      { min: 9, max: 10, label: "World Class" },
      { min: 8, max: 8.9, label: "Optimized" },
      { min: 7, max: 7.9, label: "Managed" },
      { min: 5, max: 6.9, label: "Developing" },
      { min: 3, max: 4.9, label: "Initial" },
      { min: 0, max: 2.9, label: "Critical" }
    ]
  },
  codeQuality: {
    weights: {
      maintainability: 0.4,
      security: 0.3,
      vulnerability: 0.3
    }
  },
  copq: {
    currency: "USD"
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

function mergeConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) {
    return DEFAULT_CONFIG;
  }

  const data = isRecord(raw.data) ? raw.data : {};
  const metrics = isRecord(raw.metrics) ? raw.metrics : {};
  const organization = isRecord(raw.organization) ? raw.organization : {};
  const filters = isRecord(raw.filters) ? raw.filters : {};
  const severity = isRecord(raw.severity) ? raw.severity : {};
  const maturity = isRecord(raw.maturity) ? raw.maturity : {};
  const weights = isRecord(maturity.weights) ? maturity.weights : {};
  const codeQuality = isRecord(raw.codeQuality) ? raw.codeQuality : {};
  const codeQualityWeights = isRecord(codeQuality.weights) ? codeQuality.weights : {};
  const copq = isRecord(raw.copq) ? raw.copq : {};
  const phaseAliases = isRecord(raw.phaseAliases)
    ? Object.fromEntries(
        Object.entries(raw.phaseAliases).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      )
    : DEFAULT_CONFIG.phaseAliases;

  return {
    data: { path: asString(data.path, DEFAULT_CONFIG.data.path) },
    metrics: {
      velocityMovingAverage: asNumber(metrics.velocityMovingAverage, DEFAULT_CONFIG.metrics.velocityMovingAverage)
    },
    organization: {
      enabled: typeof organization.enabled === "boolean" ? organization.enabled : DEFAULT_CONFIG.organization.enabled
    },
    filters: {
      organization: asString(filters.organization, DEFAULT_CONFIG.filters.organization),
      vertical: asString(filters.vertical, DEFAULT_CONFIG.filters.vertical),
      product: asString(filters.product, DEFAULT_CONFIG.filters.product),
      team: asString(filters.team, DEFAULT_CONFIG.filters.team)
    },
    severity: {
      critical: asStringArray(severity.critical, DEFAULT_CONFIG.severity.critical),
      high: asStringArray(severity.high, DEFAULT_CONFIG.severity.high),
      medium: asStringArray(severity.medium, DEFAULT_CONFIG.severity.medium),
      low: asStringArray(severity.low, DEFAULT_CONFIG.severity.low)
    },
    detectionPhases: asStringArray(raw.detectionPhases, DEFAULT_CONFIG.detectionPhases),
    productionPhases: asStringArray(raw.productionPhases, DEFAULT_CONFIG.productionPhases),
    phaseAliases,
    closedStatuses: asStringArray(raw.closedStatuses, DEFAULT_CONFIG.closedStatuses),
    ageBuckets: DEFAULT_CONFIG.ageBuckets,
    maturity: {
      weights: {
        automationCoverage: asNumber(weights.automationCoverage, DEFAULT_CONFIG.maturity.weights.automationCoverage),
        codeCoverage: asNumber(weights.codeCoverage, DEFAULT_CONFIG.maturity.weights.codeCoverage),
        codeQuality: asNumber(weights.codeQuality, DEFAULT_CONFIG.maturity.weights.codeQuality),
        defectLeakage: asNumber(weights.defectLeakage, DEFAULT_CONFIG.maturity.weights.defectLeakage)
      },
      leakageZeroScoreAt: asNumber(maturity.leakageZeroScoreAt, DEFAULT_CONFIG.maturity.leakageZeroScoreAt),
      bands: DEFAULT_CONFIG.maturity.bands
    },
    codeQuality: {
      weights: {
        maintainability: asNumber(
          codeQualityWeights.maintainability,
          DEFAULT_CONFIG.codeQuality.weights.maintainability
        ),
        security: asNumber(codeQualityWeights.security, DEFAULT_CONFIG.codeQuality.weights.security),
        vulnerability: asNumber(codeQualityWeights.vulnerability, DEFAULT_CONFIG.codeQuality.weights.vulnerability)
      }
    },
    copq: {
      currency: asString(copq.currency, DEFAULT_CONFIG.copq.currency)
    }
  };
}

export function findConfigPath(cwd = process.cwd()): string | null {
  const candidates = [path.resolve(cwd, "openvector.yaml"), path.resolve(cwd, "config", "openvector.yaml")];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function loadConfig(cwd = process.cwd()): { config: AppConfig; source: string | null } {
  const source = findConfigPath(cwd);
  if (!source) {
    return { config: DEFAULT_CONFIG, source: null };
  }

  const raw = parseYaml(readFileSync(source, "utf8"));
  return { config: mergeConfig(raw), source };
}

export function maturityBand(score: number | null, bands: AppConfig["maturity"]["bands"]): MaturityBand {
  if (score === null) {
    return "Unavailable";
  }

  const match = [...bands].sort((a, b) => b.min - a.min).find((band) => score >= band.min);
  return match?.label ?? "Critical";
}
