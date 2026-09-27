import type { EmployeeResponse } from "../employee/employeeTypes";

export interface AuthRequest{
    email:string;
    password:string;
}

export interface AuthResponse{
    accessToken: string;
    refreshToken: string;
    password_change_required?: boolean;
    user?: any;
    data?: any;
}

export interface RefreshTokenRequest{
    refreshToken: string;
}

export interface AuthState{
    user: EmployeeResponse | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    passwordChangeRequired?: boolean;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword?: string;
    new_password?: string;
    confirmPassword?: string;
    confirm_password?: string;
}

export interface ChangePasswordPayload {
    old_password?: string;
    oldPassword?: string;
    new_password?: string;
    newPassword?: string;
    confirm_password?: string;
    confirmPassword?: string;
}