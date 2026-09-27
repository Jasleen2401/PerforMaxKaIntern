import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type { 
  HrDashboardResponse, 
  AdminDashboardResponse,
  EmployeeDashboardResponse,
  ManagerDashboardResponse,
  InternScorecardResponse,
  InternGoalItem,
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
  useGetInternScorecardQuery,
  useGetInternGoalsQuery,
  useGetInternAppraisalsQuery,
} = dashboardApi;
