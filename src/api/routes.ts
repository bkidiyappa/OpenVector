import type { Express, Request } from "express";
import type { AppConfig, LoadedData, OrgFilter } from "../types.js";
import { getFilterOptions } from "../data/data-service.js";
import { isAll } from "../metrics/filters.js";
import type { DefectDrillFilter } from "../types.js";
import { codeQualityResponse } from "./code-quality.js";
import { coverageResponse } from "./coverage.js";
import { maturityBreakdownResponse, maturityResponse } from "./maturity.js";
import { overviewResponse } from "./overview.js";
import { productivityBreakdownResponse, productivityResponse } from "./productivity.js";
import { qualityDefectsResponse, qualityResponse } from "./quality.js";

function readFilter(req: Request, defaults: AppConfig["filters"]): OrgFilter {
  const query = req.query;
  const pick = (key: keyof OrgFilter) => {
    const value = query[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    return key === "module" ? undefined : defaults[key];
  };

  return {
    organization: isAll(pick("organization")) ? undefined : pick("organization"),
    vertical: isAll(pick("vertical")) ? undefined : pick("vertical"),
    product: isAll(pick("product")) ? undefined : pick("product"),
    team: isAll(pick("team")) ? undefined : pick("team"),
    module: isAll(pick("module")) ? undefined : pick("module")
  };
}

export function registerRoutes(app: Express, config: AppConfig, data: LoadedData): void {
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      name: "OpenVector",
      errors: data.messages.filter((message) => message.level === "error").length,
      warnings: data.messages.filter((message) => message.level === "warning").length
    });
  });

  app.get("/api/validation", (_req, res) => {
    res.json({ messages: data.messages });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      movingAverageWindow: config.metrics.velocityMovingAverage,
      organizationEnabled: config.organization.enabled,
      defaults: config.filters
    });
  });

  app.get("/api/filters", (req, res) => {
    const filter = readFilter(req, config.filters);
    res.json({ filter, options: getFilterOptions(data, filter) });
  });

  app.get("/api/overview", (req, res) => {
    res.json(overviewResponse(data, config, readFilter(req, config.filters)));
  });

  app.get("/api/productivity", (req, res) => {
    res.json(productivityResponse(data, config, readFilter(req, config.filters)));
  });

  app.get("/api/quality", (req, res) => {
    const release = typeof req.query.release === "string" && req.query.release.trim() ? req.query.release : undefined;
    res.json(qualityResponse(data, config, readFilter(req, config.filters), release));
  });

  app.get("/api/maturity", (req, res) => {
    res.json(maturityResponse(data, config, readFilter(req, config.filters)));
  });

  app.get("/api/coverage", (req, res) => {
    const date = typeof req.query.date === "string" && req.query.date.trim() ? req.query.date : undefined;
    res.json(coverageResponse(data, config, readFilter(req, config.filters), date));
  });

  app.get("/api/code-quality", (req, res) => {
    const date = typeof req.query.date === "string" && req.query.date.trim() ? req.query.date : undefined;
    res.json(codeQualityResponse(data, config, readFilter(req, config.filters), date));
  });

  app.get("/api/productivity/breakdown", (req, res) => {
    const sprint = typeof req.query.sprint === "string" ? req.query.sprint : "";
    if (!sprint) {
      res.status(400).json({ error: "sprint is required" });
      return;
    }
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : undefined;
    res.json({
      sprint,
      endDate: endDate ?? null,
      teams: productivityBreakdownResponse(data, readFilter(req, config.filters), sprint, endDate)
    });
  });

  app.get("/api/quality/defects", (req, res) => {
    const query = req.query;
    const origin = query.origin === "internal" || query.origin === "external" ? query.origin : undefined;
    const status = query.status === "open" || query.status === "closed" ? query.status : undefined;
    const drill: DefectDrillFilter = {
      severity: typeof query.severity === "string" ? query.severity : undefined,
      phase: typeof query.phase === "string" ? query.phase : undefined,
      origin,
      ageBucket: typeof query.ageBucket === "string" ? query.ageBucket : undefined,
      status,
      statusName: typeof query.statusName === "string" ? query.statusName : undefined,
      release: typeof query.release === "string" ? query.release : undefined,
      productionOnly: query.productionOnly === "true",
      product: typeof query.product === "string" ? query.product : undefined,
      team: typeof query.team === "string" ? query.team : undefined,
      copq: query.copq === "true",
      copqRelease: typeof query.copqRelease === "string" ? query.copqRelease : undefined,
      copqProduct: typeof query.copqProduct === "string" ? query.copqProduct : undefined,
      copqTeam: typeof query.copqTeam === "string" ? query.copqTeam : undefined
    };
    res.json({
      drill,
      defects: qualityDefectsResponse(data, config, readFilter(req, config.filters), drill)
    });
  });

  app.get("/api/maturity/breakdown", (req, res) => {
    const component = typeof req.query.component === "string" ? req.query.component : "";
    if (!component) {
      res.status(400).json({ error: "component is required" });
      return;
    }
    res.json({
      component,
      teams: maturityBreakdownResponse(data, config, readFilter(req, config.filters), component)
    });
  });
}
