import { api } from "../../services/api";
import type { ApiResponse } from "../../services/ApiResponse";
import type {
  AuthRequest,
  AuthResponse,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordPayload,
} from "./authTypes";

import type { EmployeeResponse } from "../employee/employeeTypes";

import { setUser } from "./authSlice";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, AuthRequest>({
      query: (data) => ({
        url: "/auth/login",
        method: "POST",
        body: data,
      }),
      transformResponse: (res: any) => res?.data ?? res,
    }),
    refreshToken: builder.mutation<AuthResponse, RefreshTokenRequest>({
      query: (data) => ({
        url: "/auth/refresh-token",
        method: "POST",
        body: data,
      }),
      transformResponse: (res: any) => res?.data ?? res,
    }),
    getMe: builder.query<EmployeeResponse, void>({
      query: () => "/auth/me",
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: ["Profile"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data));
        } catch {}
      },
    }),
    unlockEmployee: builder.mutation<void, number>({
      query: (employeeId) => ({
        url: `/auth/unlock/${employeeId}`,
        method: "PUT",
      }),
    }),
    logoutUserApi: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    forgotPassword: builder.mutation<void, ForgotPasswordRequest>({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),
    resetPassword: builder.mutation<void, ResetPasswordRequest>({
      query: (data) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: data,
      }),
    }),
    validateToken: builder.query<boolean, void>({
      query: () => "/auth/validate",
      transformResponse: (res: ApiResponse<boolean>) => res.data,
    }),
    revokeSessions: builder.mutation<void, number>({
      query: (employeeId) => ({
        url: `/auth/revoke-sessions/${employeeId}`,
        method: "POST",
      }),
    }),
    changePassword: builder.mutation<{ code: number; message: string; data?: any }, ChangePasswordPayload>({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useGetMeQuery,
  useUnlockEmployeeMutation,
  useLogoutUserApiMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useValidateTokenQuery,
  useRevokeSessionsMutation,
  useChangePasswordMutation,
} = authApi;

