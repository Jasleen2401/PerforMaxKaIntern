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
  inProgressGoals?: number;
  averageProgress: number;
  pendingTasksCount?: number;
  upcomingDeadlinesCount?: number;
  activeAppraisalStatus?: string;
  publishedScore: number | null;
  performanceClassification?: string | null;
}

export interface InternComment {
  id: string;
  authorName: string;
  authorRole: string;
  comment: string;
  isMentor: boolean;
  createdAt: string;
  parentId?: string | null;
}

export interface InternGoalItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  completionPercentage: number;
  weightage?: number;
  status: string;
  priority: string;
  dueDate: string | null;
  cycleName: string;
  assignedByName?: string | null;
  comments?: InternComment[];
  evidenceCount?: number;
}

export interface InternTaskItem {
  id: string;
  title: string;
  category: string;
  instructions: string;
  priority: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  hoursSpent: number | null;
  completionNotes: string;
  artifactUrl: string;
  isPermittedToComplete: boolean;
  isOverdue: boolean;
}

export interface InternEvidenceItem {
  id: string;
  goalId: string | null;
  goalTitle: string;
  title: string;
  description: string;
  externalUrl: string;
  fileAttachment: string | null;
  fileName: string | null;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REVISION_REQUESTED';
  reviewNotes: string;
  reviewedBy: string | null;
  createdAt: string;
}

export interface InternMentorInfo {
  name: string;
  email: string;
  designation: string;
  department: string;
  avatar: string;
  status: string;
}

export interface InternCycleInfo {
  id: string | null;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  currentPhase: string;
  daysRemaining: number;
}

export interface InternDeadlineItem {
  id: string;
  title: string;
  type: 'TASK' | 'GOAL' | 'EVALUATION' | 'EVIDENCE';
  dueDate: string;
  daysLeft: number;
  isUrgent: boolean;
  status: string;
}

export interface InternPublishedResults {
  isPublished: boolean;
  overallScore: number | null;
  classification: string | null;
  reviewerComments: string | null;
  finalComments: string | null;
  areasForImprovement: string[];
  publishedAt: string | null;
  reviewerName?: string;
}

export interface InternOverviewData {
  personalScorecard: InternScorecardResponse;
  mentor: InternMentorInfo;
  cycle: InternCycleInfo;
  deadlines: InternDeadlineItem[];
  publishedResults: InternPublishedResults;
}

export interface InternSelfAppraisalData {
  isEnabled: boolean;
  isSubmitted: boolean;
  submittedAt: string | null;
  selfRating: number;
  achievements: string;
  challenges: string;
  skillsAcquired: string;
  mentorshipNeeds: string;
  reflectionSummary: string;
  hrQuestions: Array<{
    id: string;
    category: string;
    question: string;
    placeholder: string;
  }>;
  cycleName: string;
}

export interface InternPublishedFeedbackData {
  isPublished: boolean;
  cycleName?: string;
  overallScore?: number;
  performanceClassification?: string;
  publishedAt?: string;
  mentorName?: string;
  mentorFeedback?: string;
  finalConclusion?: string;
  areasForImprovement?: string[];
  replies?: Array<{
    id: string;
    replyText: string;
    createdAt: string;
  }>;
  isReplyPermitted?: boolean;
  message?: string;
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
