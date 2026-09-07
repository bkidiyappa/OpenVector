# OpenVector

**Open-source engineering metrics and intelligence dashboard.**

OpenVector is a lightweight, open-source Engineering Health & Intelligence platform that turns engineering data into actionable insights across delivery, quality, testing, code health, release, reliability, and security.

```text
Data from different sources → CSV → Metric Engine → Dashboard
```

OpenVector is local-first. There is no database, no cloud account, and no individual ranking. Story points and velocity are team trends, not a leaderboard.

## Why it exists

Engineering leaders need a lightweight way to see:

- Delivery and capacity trends
- Defect leakage and quality signals
- A simple quality-maturity score

without standing up Jira connectors, warehouses, or a metrics platform.

## Architecture

```text
CSV files
   ↓
Data loader + validation
   ↓
Metric engine (TypeScript)
   ↓
JSON API
   ↓
React dashboard (Recharts)
```

The UI never calculates business metrics. The metric engine never depends on a specific source. V1 reads CSV only so later connectors (Azure DevOps, Jira, GitHub, Sonar, OpenSecant) can reuse the same canonical model.

## Requirements

- Node.js 20 or later
- npm

## Installation

```bash
git clone <repository>
cd OpenVector
npm install
npm run start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Sample data in `/data` is used automatically.

To use your own files:

1. Replace the CSVs in `./data` (or set `data.path` in `openvector.yaml`)
2. Restart OpenVector
3. Refresh the browser

No application source changes are required.

## Commands

| Command | Purpose |
|---|---|
| `npm run start` | Build the UI and serve the dashboard + API |
| `npm run dev` | API on port 3000, Vite UI on port 5173 |
| `npm test` | Metric-engine unit tests |
| `npm run build` | Production UI build only |

## Configuration

Edit `openvector.yaml`. Most users only need:

```yaml
data:
  path: ./data
```

Optional settings include the velocity moving-average window, severity aliases, detection phases, and maturity weights. See [docs/data-format.md](docs/data-format.md).

## CSV format

V1 reads these files:

| File | Used for |
|---|---|
| `teams.csv` | Organization → vertical → product → team |
| `sprints.csv` | Capacity, velocity, planned vs completed |
| `defects.csv` | Leakage, phase, age, severity, internal vs external |
| `release-plan.csv` | Release milestones on the open/closure trend |
| `copq-rates.csv` | Phase × severity unit costs for Visible COPQ |
| `automation.csv` | Automation coverage (maturity) |
| `code-coverage.csv` | Lines and coverage by org / product / module |
| `code-quality.csv` | SonarQube maintainability, security, and vulnerability |

Column definitions live in [docs/data-format.md](docs/data-format.md). Dates must be `YYYY-MM-DD`. Invalid rows are rejected with an explicit error; values are never invented.

## Metrics

[docs/metrics.md](docs/metrics.md) is the full guide: a screenshot of each page, the formula for every metric, and how to infer whether the signal is healthy, mixed, or a problem.

Highlights:

- **Available capacity** = team size × working days − holiday capacity − leave days
- **Velocity** = completed story points
- **SP / capacity day** = completed points ÷ available person-days (not “per developer”)
- **Defect leakage** = production-phase defects ÷ defects in the current view × 100
- **Visible COPQ** = Σ unit_cost(phase, severity) for defects in view (optional `copq-rates.csv`)
- **Quality maturity** = weighted average of normalized component scores (0–10)

## Dashboards

- **Overview** — executive KPIs and defined trend arrows
- **Productivity** — capacity, velocity, planned vs completed, and SP / capacity day on one chart
- **Quality** — leakage, Visible COPQ by release (stacked by phase), DRE by phase, daily open/closure (with release-plan milestones), status, severity, age
- **Maturity** — raw values, scores, weights, overall band, plus drillable coverage and SonarQube quality trends

Filters (organization, vertical, product, team) apply to every page. Coverage and SonarQube quality are keyed by **module**, not team.

## Roadmap

The metrics to build, and which are already on the dashboard, are in [docs/roadmap.md](docs/roadmap.md).

V1 is CSV only. Later, keep the metric engine and add sources:

- Azure DevOps, Jira, GitHub, GitLab
- SonarQube / SonarCloud
- OpenSecant execution metrics
- `npx openvector` CLI (`start`, `validate`, `import`)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/contributing.md](docs/contributing.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).
