export interface HrDashboardResponse {
  totalEmployeesUnderReview: number;
  appraisalCompletionRate: number;
  pendingSelfAssessments: number;
  pendingManagerReviews: number;
  openPips: number;
  promotionCandidates: number;
  departmentPerformance: DepartmentPerformance[];
  topPerformers: TopPerformer[];
  alerts: DashboardAlert[];
  currentCyclePhase?: string;
  cyclePhaseProgress?: number;
  nonCompliantManagers?: string[];
  pipByDepartment?: Record<string, PipSummary>;
  daysUntilCycleEnd?: number;
}

export interface DepartmentPerformance {
  departmentName: string;
  averageScore: number;
  employeeCount: number;
}

export interface TopPerformer {
  employeeName: string;
  department: string;
  score: number;
  photoUrl?: string;
}

export interface DashboardAlert {
  title: string;
  message: string;
  type: "info" | "warning" | "danger";
  timestamp: string;
}

export interface AdminDashboardResponse {
  totalEmployees: number;
  totalDepartments: number;
  totalManagers: number;
  activeUsers: number;
  lockedAccounts: number;
  activeCycles: number;
  recentActivities: RecentActivity[];
  securityAlerts: SecurityAlert[];
  failedLoginsLast24h?: number;
  accountsCreatedThisMonth?: number;
  accountsDeactivatedThisMonth?: number;
  activeCycleName?: string;
  cycleStartDate?: string;
  cycleEndDate?: string;
}

export interface RecentActivity {
  action: string;
  user: string;
  timestamp: string;
  module: string;
}

export interface SecurityAlert {
  event: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  timestamp: string;
  details: string;
}

export interface EmployeeDashboardResponse {
  currentScore: number;
  kpiCompletionPercentage: number;
  pendingTasksCount: number;
  feedbackCount: number;
  performanceTrend: ScoreTrend[];
  kpiStatus: KpiProgress[];
  appraisalTimeline: UpcomingPhase[];
  tasks: DashboardTask[];
  managerLastScore?: number;
  managerLastComment?: string;
  daysUntilNextDeadline?: number;
  teamRank?: number;
  teamSize?: number;
  onPip?: boolean;
}

export interface ScoreTrend {
  period: string;
  score: number;
}

export interface KpiProgress {
  name: string;
  value: number;
}

export interface UpcomingPhase {
  phase: string;
  status: string;
  date: string;
  active: boolean;
}

export interface DashboardTask {
  id: number;
  title: string;
  deadline: string;
  priority: string;
}

export interface InternScorecardResponse {
  totalGoals: number;
  completedGoals: number;
  averageProgress: number;
  activeAppraisalStatus: string;
  publishedScore: number | null;
}

export interface InternGoalItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  completionPercentage: number;
  status: string;
  priority: string;
  dueDate: string | null;
  cycleName: string;
  assignedByName?: string | null;
}

export interface InternAppraisalItem {
  id: string;
  cycleName: string;
  appraisalType: string;
  status: string;
  overallScore: number | null;
  selfScore: number | null;
  managerScore: number | null;
  reviewerComments: string | null;
  finalComments: string | null;
  published: boolean;
}

export interface ManagerDashboardResponse {
  teamSize: number;
  reviewsCompleted: number;
  totalReviews: number;
  pendingReviews: number;
  feedbackRequests: number;
  teamPerformance: TeamMemberPerformance[];
  teamKpis: TeamKpiProgress[];
  urgentReviews: DashboardTask[];
  teamAvgScore?: number;
  companyAvgScore?: number;
  pendingSelfAssessmentNames?: string[];
  atRiskEmployees?: AtRiskEmployee[];
  overdueReviews?: OverdueReview[];
}

export interface TeamMemberPerformance {
  name: string;
  score: number;
}

export interface TeamKpiProgress {
  name: string;
  progress: number;
  color: string;
}

export interface AtRiskEmployee {
  name: string;
  currentScore: number;
  previousScore: number;
  delta: number;
}

export interface OverdueReview {
  employeeId: number;
  employeeName: string;
  daysOverdue: number;
}

export interface PipSummary {
  active: number;
  closed: number;
}
