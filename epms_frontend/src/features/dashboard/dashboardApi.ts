import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { 
  HrDashboardResponse, 
  AdminDashboardResponse,
  EmployeeDashboardResponse,
  ManagerDashboardResponse,
  InternScorecardResponse,
  InternOverviewData,
  InternGoalItem,
  InternTaskItem,
  InternEvidenceItem,
  InternSelfAppraisalData,
  InternPublishedFeedbackData,
  InternAppraisalItem
} from "./dashboardTypes";

export const dashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getHrDashboard: builder.query<HrDashboardResponse, void>({
      query: () => "/dashboard/hr",
      transformResponse: (res: ApiResponse<HrDashboardResponse>) => res.data,
    }),
    getAdminDashboard: builder.query<AdminDashboardResponse, void>({
      query: () => "/dashboard/admin",
      transformResponse: (res: ApiResponse<AdminDashboardResponse>) => res.data,
    }),
    getEmployeeDashboard: builder.query<EmployeeDashboardResponse, void>({
      query: () => "/dashboard/employee",
      transformResponse: (res: ApiResponse<EmployeeDashboardResponse>) => res.data,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getManagerDashboard: builder.query<ManagerDashboardResponse, void>({
      query: () => "/dashboard/manager",
      transformResponse: (res: ApiResponse<ManagerDashboardResponse>) => res.data,
    }),

    // Comprehensive Intern Module Endpoints
    getInternOverview: builder.query<InternOverviewData, void>({
      query: () => "/intern/overview/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Profile", "GoalSet", "Appraisal"],
    }),
    getInternScorecard: builder.query<InternScorecardResponse, void>({
      query: () => "/intern/scorecard/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet", "Appraisal"],
    }),
    getInternGoals: builder.query<InternGoalItem[], void>({
      query: () => "/intern/my-goals/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet"],
    }),
    updateInternGoalProgress: builder.mutation<any, { id: string; progress: number; comment?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/my-goals/${id}/progress/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Appraisal", "Profile"],
    }),
    addInternGoalComment: builder.mutation<any, { id: string; comment: string; parentId?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/my-goals/${id}/comments/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet"],
    }),
    getInternTasks: builder.query<InternTaskItem[], void>({
      query: () => "/intern/tasks/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet", "Profile"],
    }),
    completeInternTask: builder.mutation<any, { id: string; isCompleted: boolean; completedAt?: string; hoursSpent?: number; completionNotes?: string; artifactUrl?: string }>({
      query: ({ id, ...body }) => ({
        url: `/intern/tasks/${id}/complete/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet", "Profile"],
    }),
    getInternEvidence: builder.query<InternEvidenceItem[], void>({
      query: () => "/intern/evidence/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["GoalSet"],
    }),
    submitInternEvidence: builder.mutation<any, FormData | { goalId?: string; title: string; description?: string; externalUrl?: string }>({
      query: (body) => ({
        url: "/intern/evidence/submit/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["GoalSet"],
    }),
    getInternSelfAppraisal: builder.query<InternSelfAppraisalData, void>({
      query: () => "/intern/self-appraisal/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    submitInternSelfAppraisal: builder.mutation<any, { selfRating?: number; achievements?: string; challenges?: string; skillsAcquired?: string; mentorshipNeeds?: string; reflectionSummary?: string; isDraft?: boolean }>({
      query: (body) => ({
        url: "/intern/self-appraisal/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal", "Profile"],
    }),
    getInternPublishedFeedback: builder.query<InternPublishedFeedbackData, void>({
      query: () => "/intern/published-feedback/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
    replyToMentorFeedback: builder.mutation<any, { replyText: string }>({
      query: (body) => ({
        url: "/intern/published-feedback/reply/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Appraisal"],
    }),
    getInternAppraisals: builder.query<InternAppraisalItem[], void>({
      query: () => "/intern/my-appraisals/",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Appraisal"],
    }),
  }),
});

export const { 
  useGetHrDashboardQuery, 
  useGetAdminDashboardQuery,
  useGetEmployeeDashboardQuery,
  useGetManagerDashboardQuery,
  useGetInternOverviewQuery,
  useGetInternScorecardQuery,
  useGetInternGoalsQuery,
  useUpdateInternGoalProgressMutation,
  useAddInternGoalCommentMutation,
  useGetInternTasksQuery,
  useCompleteInternTaskMutation,
  useGetInternEvidenceQuery,
  useSubmitInternEvidenceMutation,
  useGetInternSelfAppraisalQuery,
  useSubmitInternSelfAppraisalMutation,
  useGetInternPublishedFeedbackQuery,
  useReplyToMentorFeedbackMutation,
  useGetInternAppraisalsQuery,
} = dashboardApi;
