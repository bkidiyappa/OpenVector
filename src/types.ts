export type OrgFilter = {
  organization?: string;
  vertical?: string;
  product?: string;
  team?: string;
  module?: string;
};

export type TeamRow = {
  organization: string;
  vertical: string;
  product: string;
  team: string;
  member_count: number;
};

export type SprintRow = {
  organization: string;
  vertical: string;
  product: string;
  team: string;
  sprint: string;
  start_date: string;
  end_date: string;
  team_size: number;
  working_days: number;
  holiday_days: number;
  leave_days: number;
  planned_points: number;
  completed_points: number;
};

export type DefectRow = {
  id: string;
  organization: string;
  vertical: string;
  product: string;
  team: string;
  title: string;
  severity: string;
  created_date: string;
  detected_date: string | null;
  resolved_date: string | null;
  detection_phase: string;
  customer_reported: boolean;
  found_in_release: string;
  scheduled_for_release: string;
  status: string;
};

export type AutomationRow = {
  organization: string;
  vertical: string;
  product: string;
  team: string;
  date: string;
  automation_coverage: number;
};

export type CodeCoverageRow = {
  organization: string;
  vertical: string;
  product: string;
  module: string;
  date: string;
  total_lines: number;
  coverable_lines: number;
  covered_lines: number;
};

export type CodeQualityRow = {
  organization: string;
  vertical: string;
  product: string;
  module: string;
  date: string;
  maintainability: number;
  security: number;
  vulnerability: number;
};

export type SeverityGroup = "critical" | "high" | "medium" | "low" | "unmapped";

export type TrendDirection = "improving" | "stable" | "declining";
export type MetricDirection = "higher" | "lower";

export type Trend = {
  direction: TrendDirection;
  previous: number | null;
  current: number | null;
};

export type ValidationMessage = {
  level: "error" | "warning";
  file: string;
  message: string;
};

export type ReleasePlanRow = {
  organization: string;
  vertical: string;
  product: string;
  release: string;
  dev_start: string | null;
  dev_complete: string | null;
  test_start: string | null;
  test_complete: string | null;
  prod_deployment: string | null;
};

export type ReleaseMilestone = {
  key: string;
  label: string;
  date: string;
};

export type CopqRateRow = {
  detection_phase: string;
  severity: string;
  unit_cost: number;
};

export type LoadedData = {
  teams: TeamRow[];
  sprints: SprintRow[];
  defects: DefectRow[];
  automation: AutomationRow[];
  codeCoverage: CodeCoverageRow[];
  codeQuality: CodeQualityRow[];
  releasePlans: ReleasePlanRow[];
  copqRates: CopqRateRow[];
  messages: ValidationMessage[];
};

export type FilterOptions = {
  organizations: string[];
  verticals: string[];
  products: string[];
  teams: string[];
};

export type SprintMetric = {
  sprint: string;
  startDate: string;
  endDate: string;
  plannedPoints: number;
  completedPoints: number;
  availableCapacity: number;
  velocity: number;
  storyPointsPerCapacityDay: number | null;
  movingAverage: number | null;
};

export type ProductivityMetrics = {
  latest: {
    sprint: string | null;
    availableCapacity: number | null;
    completedPoints: number | null;
    storyPointsPerCapacityDay: number | null;
    velocity: number | null;
  };
  sprints: SprintMetric[];
  movingAverageWindow: number;
  usedWindow: number;
  notes: string[];
  trends: {
    velocity: Trend | null;
    storyPointsPerCapacityDay: Trend | null;
  };
};

export type ReleaseDre = {
  release: string;
  dre: number | null;
  removed: number;
  leaked: number;
  total: number;
};

export type ReleaseOpenClosed = {
  release: string;
  open: number;
  closed: number;
  total: number;
};

export type ReleasePhaseDre = {
  release: string;
  dre: number | null;
  open: number;
  closed: number;
  counts: Record<string, number>;
};

export type DailyOpenClosePoint = {
  date: string;
  opened: number;
  closed: number;
  openBacklog: number;
};

export type ReleaseDailyTrend = {
  release: string;
  days: DailyOpenClosePoint[];
};

export type CopqPhaseBucket = {
  phase: string;
  cost: number;
  count: number;
};

export type CopqSeverityBucket = {
  key: string;
  label: string;
  cost: number;
  count: number;
};

export type CopqStackRow = {
  key: string;
  label: string;
  cost: number;
  count: number;
  byPhase: CopqPhaseBucket[];
};

export type CopqTeamBucket = CopqStackRow & {
  product: string;
  team: string;
};

export type CopqProductBucket = CopqStackRow & {
  product: string;
  organization: string;
  vertical: string;
  teams: CopqTeamBucket[];
  byRelease: CopqStackRow[];
};

export type CopqReleaseBucket = CopqStackRow & {
  release: string;
  products: CopqProductBucket[];
};

export type CopqDailyPoint = {
  date: string;
  cost: number;
  count: number;
  byPhase: CopqPhaseBucket[];
};

export type CopqMetrics = {
  total: number;
  currency: string;
  pricedCount: number;
  omittedCount: number;
  byPhase: CopqPhaseBucket[];
  bySeverity: CopqSeverityBucket[];
  byRelease: CopqReleaseBucket[];
  byProduct: CopqProductBucket[];
  dailyTrend: CopqDailyPoint[];
  notes: string[];
  trend: Trend | null;
};

export type QualityMetrics = {
  defectLeakage: number | null;
  openDefects: number;
  customerDefects: number;
  totalDefects: number;
  latestRelease: string | null;
  selectedRelease: string | null;
  dreByRelease: ReleaseDre[];
  openClosedByRelease: ReleaseOpenClosed[];
  releasePhaseDre: ReleasePhaseDre[];
  detectionPhases: string[];
  dailyTrend: DailyOpenClosePoint[];
  dailyTrends: ReleaseDailyTrend[];
  releaseMilestones: ReleaseMilestone[];
  byStatus: { status: string; count: number }[];
  bySeverity: { key: string; label: string; count: number }[];
  byPhase: { phase: string; count: number }[];
  byAge: { bucket: string; count: number }[];
  internalVsExternal: { key: "internal" | "external"; count: number }[];
  copq: CopqMetrics | null;
  notes: string[];
  trends: {
    defectLeakage: Trend | null;
    openDefects: Trend | null;
    customerDefects: Trend | null;
  };
};

export type MaturityComponent = {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  score: number | null;
  weight: number;
};

export type MaturityBand =
  | "World Class"
  | "Optimized"
  | "Managed"
  | "Developing"
  | "Initial"
  | "Critical"
  | "Unavailable";

export type MaturityMetrics = {
  overall: number | null;
  band: MaturityBand;
  components: MaturityComponent[];
  notes: string[];
  trend: Trend | null;
};

export type SprintTeamBreakdown = {
  sprint: string;
  endDate: string;
  organization: string;
  vertical: string;
  product: string;
  team: string;
  plannedPoints: number;
  completedPoints: number;
  availableCapacity: number;
  velocity: number;
  storyPointsPerCapacityDay: number | null;
};

export type DefectDrillFilter = {
  severity?: string;
  phase?: string;
  origin?: "internal" | "external";
  ageBucket?: string;
  status?: "open" | "closed";
  statusName?: string;
  release?: string;
  productionOnly?: boolean;
  product?: string;
  team?: string;
  copq?: boolean;
  copqChart?: boolean;
  copqProductTrend?: boolean;
  copqRelease?: string;
  copqProduct?: string;
  copqTeam?: string;
};

export type DefectListItem = {
  id: string;
  organization: string;
  vertical: string;
  product: string;
  team: string;
  title: string;
  severity: string;
  severityGroup: string;
  created_date: string;
  resolved_date: string | null;
  detection_phase: string;
  customer_reported: boolean;
  found_in_release: string;
  scheduled_for_release: string;
  status: string;
  ageDays: number;
  ageBucket: string;
  estimatedCost?: number | null;
};

export type MaturityTeamBreakdown = {
  organization: string;
  vertical: string;
  product: string;
  team: string;
  module?: string;
  value: number | null;
  score: number | null;
  unit: string;
  date: string | null;
};

export type CoverageSnapshot = {
  date: string | null;
  coverage: number | null;
  totalLines: number;
  coverableLines: number;
  coveredLines: number;
};

export type CoverageBreakdown = CoverageSnapshot & {
  organization: string;
  vertical: string;
  product: string;
  module: string;
  label: string;
  level: "product" | "module";
};

export type CoverageMetrics = {
  latest: CoverageSnapshot;
  trend: CoverageSnapshot[];
  breakdown: CoverageBreakdown[];
  groupBy: "product" | "module";
  notes: string[];
};

export type CodeQualitySnapshot = {
  date: string | null;
  maintainability: number | null;
  security: number | null;
  vulnerability: number | null;
  score: number | null;
};

export type CodeQualityBreakdown = CodeQualitySnapshot & {
  organization: string;
  vertical: string;
  product: string;
  module: string;
  label: string;
  level: "product" | "module";
};

export type CodeQualityMetrics = {
  latest: CodeQualitySnapshot;
  trend: CodeQualitySnapshot[];
  breakdown: CodeQualityBreakdown[];
  groupBy: "product" | "module";
  weights: {
    maintainability: number;
    security: number;
    vulnerability: number;
  };
  notes: string[];
};

export type OverviewMetrics = {
  maturity: Pick<MaturityMetrics, "overall" | "band" | "trend">;
  productivity: {
    velocity: number | null;
    storyPointsPerCapacityDay: number | null;
    trends: ProductivityMetrics["trends"];
  };
  quality: {
    defectLeakage: number | null;
    openDefects: number;
    customerDefects: number;
    copq: Pick<CopqMetrics, "total" | "currency" | "trend"> | null;
    trends: QualityMetrics["trends"];
  };
  notes: string[];
};

export type AppConfig = {
  data: { path: string };
  metrics: { velocityMovingAverage: number };
  organization: { enabled: boolean };
  filters: {
    organization: string;
    vertical: string;
    product: string;
    team: string;
  };
  severity: Record<"critical" | "high" | "medium" | "low", string[]>;
  detectionPhases: string[];
  productionPhases: string[];
  phaseAliases: Record<string, string>;
  closedStatuses: string[];
  ageBuckets: { label: string; min: number; max: number | null }[];
  maturity: {
    weights: {
      automationCoverage: number;
      codeCoverage: number;
      codeQuality: number;
      defectLeakage: number;
    };
    leakageZeroScoreAt: number;
    bands: { min: number; max: number; label: MaturityBand }[];
  };
  codeQuality: {
    weights: {
      maintainability: number;
      security: number;
      vulnerability: number;
    };
  };
  copq: {
    currency: string;
  };
};
