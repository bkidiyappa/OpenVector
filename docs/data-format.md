# Data format

Place CSV files in the directory set by `data.path` (default `./data`). Headers must match exactly. Dates use `YYYY-MM-DD`. For what each metric means and how to read the charts, see [metrics.md](metrics.md).

## teams.csv

```text
organization,vertical,product,team,member_count
```

Hierarchy: organization → vertical → product → team.

## sprints.csv

```text
organization,vertical,product,team,sprint,start_date,end_date,team_size,working_days,holiday_days,leave_days,planned_points,completed_points
```

`leave_days` is total person-days of leave in the sprint, not days per person.

## defects.csv

```text
id,organization,vertical,product,team,title,severity,created_date,detected_date,resolved_date,detection_phase,customer_reported,found_in_release,scheduled_for_release,status
```

- `detected_date` and `resolved_date` may be empty.
- `customer_reported` is `true` or `false`.
- `found_in_release` is the release where the defect was found. Open/closure and DRE charts use this field.
- `scheduled_for_release` is the release planned to contain the fix.
- Closed statuses default to `Closed`, `Resolved`, `Done`.

## release-plan.csv

```text
organization,vertical,product,release,dev_start,dev_complete,test_start,test_complete,prod_deployment
```

One row per product release. Milestone dates may be empty if that event has not happened yet. When a release is selected on Quality, these dates appear as vertical markers on the Open / Closure Daily Trend chart.

## copq-rates.csv

```text
detection_phase,severity,unit_cost
```

Optional. If this file is absent, Visible COPQ cards and charts are omitted.

- `detection_phase` uses canonical names after aliases (Development, System Testing, UAT, Production).
- `severity` accepts CSV labels (`Sev1`) or groups (`critical`).
- `unit_cost` is a number in the currency from `copq.currency` in `openvector.yaml` (default USD). OpenVector does not invent rates. A defect with no matching row is omitted from cost.

Sample matrix (illustrative; later phases cost more, Critical more than Low):

| Phase | Critical | High | Medium | Low |
|---|---:|---:|---:|---:|
| Development | 200 | 120 | 60 | 30 |
| System Testing | 800 | 400 | 200 | 80 |
| UAT | 2000 | 1000 | 400 | 150 |
| Production | 8000 | 4000 | 1500 | 500 |

## automation.csv

```text
organization,vertical,product,team,date,automation_coverage
```

`automation_coverage` is 0–100. The latest `date` per team is used for maturity.

## code-coverage.csv

```text
organization,vertical,product,module,date,total_lines,coverable_lines,covered_lines
```

Coverage = covered lines ÷ coverable lines × 100. The latest `date` per module is used for maturity. Hierarchy is organization → vertical → product → module (no team).

## code-quality.csv

```text
organization,vertical,product,module,date,maintainability,security,vulnerability
```

SonarQube-style ratings, each 0–10 (higher is better). The final score is a weighted average of the three. Weights are set in `openvector.yaml` under `codeQuality.weights`. The latest `date` per module is used for maturity.

## Validation

On startup OpenVector checks required columns and each row. Missing columns produce an error such as:

```text
ERROR: defects.csv

Missing required column:
    severity

Expected columns:
    id
    organization
    ...
```

Malformed rows are rejected. Optional files (`automation.csv`, `code-coverage.csv`, `code-quality.csv`, `release-plan.csv`, `copq-rates.csv`) may be absent; related charts or maturity inputs are then omitted.

## Configuration

`openvector.yaml` controls data path, moving-average window, default filters, severity aliases, detection phases, production phases, maturity weights, SonarQube code-quality weights, and COPQ currency. See the sample file in the repository root.
