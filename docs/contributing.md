# Contributor notes

## Metric engine

Add or change calculations in `src/metrics/` and cover them in `tests/`. API files in `src/api/` should only filter data and call the engine.

## CSV schemas

Column lists and Zod schemas live in `src/data/schemas.ts`. If you add a column:

1. Update the schema and the sample CSV
2. Update `docs/data-format.md`
3. Add a validation test if the column is required

## UI

Dashboard pages consume `/api/*` JSON. Do not re-implement leakage, capacity, or maturity math in components.

## Metrics documentation

If you change a formula, a chart, or dashboard chrome, update [metrics.md](metrics.md) (what the metric is and how to infer it) and regenerate the screenshots:

```bash
npm install --no-save playwright-core
npm run start
node scripts/capture-docs-screenshots.mjs
```

The capture script uses the installed Chrome browser. Keep the five files in `docs/images/` in sync with the live pages.

## Future sources

New connectors should emit the canonical row types in `src/types.ts`. Do not teach the metric engine about Jira, Azure DevOps, or GitHub.
