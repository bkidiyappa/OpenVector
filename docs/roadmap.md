# Metrics roadmap

OpenVector is an engineering metrics dashboard. This list is the **important** metrics to build and keep — not every possible chart.

Status reflects what the dashboard computes today. Formulas and how to read them live in [metrics.md](metrics.md).

| Status | Meaning |
|---|---|
| Done | On the dashboard (CSV → metric engine → API → UI) |
| Planned | Not built yet |

---

## Tier 1 — Must have

Delivery, quality, test effectiveness, code health, and DORA release/reliability.

| # | Metric | Status | Where it is / what it is |
|---|---|---|---|
| 1 | Velocity | Done | Overview and Productivity. Completed story points in the latest sprint. |
| 2 | Planned vs Completed | Done | Productivity chart. Planned and completed story points on the same series. |
| 3 | Cycle Time | Planned | Work start → done (stories / work items). Not the same as defect age. |
| 4 | Defect Leakage | Done | Overview and Quality. Production-phase defects ÷ defects in view. |
| 5 | DRE | Done | Quality phase/DRE chart. Defects found before production ÷ total in the release. |
| 6 | Automation Coverage | Done | Maturity. Latest automation coverage per team, then averaged. |
| 7 | Flaky Test Rate | Planned | Tests that pass and fail without a code change, as a share of the suite. |
| 8 | Code Coverage | Done | Maturity. Covered ÷ coverable lines, latest snapshot per module. |
| 9 | Maintainability | Done | Maturity / SonarQube. Maintainability rating (0–10) in the code-quality score. |
| 10 | Deployment Frequency | Planned | How often production deploys land (DORA). |
| 11 | Change Failure Rate | Planned | Share of production changes that cause a failure or rollback (DORA). |
| 12 | MTTR | Planned | Mean time to restore service after a production failure (DORA). |

**Tier 1: 7 of 12 done.**

---

## Tier 2 — Highly valuable

Flow, risk-weighted quality, test execution, debt, and service level.

| # | Metric | Status | Where it is / what it is |
|---|---|---|---|
| 1 | Lead Time | Planned | Idea or commit request → value in the user’s hands. Wider than cycle time. |
| 2 | Flow Efficiency | Planned | Active work time ÷ (active + wait time). Shows queueing, not just duration. |
| 3 | Severity-weighted Defects | Planned | Defect counts weighted by severity (Critical counts more than Low). Count-by-severity on Quality is not this metric. |
| 4 | Defect Aging | Done | Quality. Open: today − created; closed: resolved − created. Shown in age buckets. |
| 5 | Critical Path Coverage | Planned | Coverage on the modules / paths that carry production traffic, not the org average. |
| 6 | Automation Pass Rate | Planned | Automated tests that passed ÷ tests run. Distinct from coverage. |
| 7 | Technical Debt | Planned | Effort or index to remediate known code issues. Maintainability rating is not a debt total. |
| 8 | PR Cycle Time | Planned | Pull request open → merge. |
| 9 | Lead Time for Change | Planned | Commit → production (DORA). Narrower than Lead Time. |
| 10 | SLO Compliance | Planned | Share of time the service meets its SLO. |

**Tier 2: 1 of 10 done.**

---

## Also on the dashboard

These are already shipped. They are supporting signals, not extra roadmap items:

- Available capacity and SP / capacity day (Productivity)
- Open defects and customer-found defects (Quality)
- Visible COPQ (Quality / Overview)
- Quality maturity composite and band (Maturity / Overview)
- SonarQube security and vulnerability ratings (with maintainability)

Do not add more KPIs unless they replace or complete a row above.

---

## Build order (remaining)

1. **DORA set** — Deployment Frequency, Change Failure Rate, MTTR, Lead Time for Change  
2. **Flow** — Cycle Time, then Lead Time and Flow Efficiency  
3. **Test execution** — Automation Pass Rate, Flaky Test Rate  
4. **Risk** — Severity-weighted Defects, Technical Debt, Critical Path Coverage  
5. **Change and service** — PR Cycle Time, SLO Compliance  

Each new metric follows the existing pattern: optional CSV (or later a connector) → engine in `src/metrics/` → API → dashboard page. Missing data is omitted, never invented.
