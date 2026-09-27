import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse, AuthState } from "./authTypes";
import type { EmployeeResponse } from "../employee/employeeTypes";

const getStoredToken = (key: string) => {
  const token = localStorage.getItem(key);
  if (token === "undefined" || token === "null" || !token) return null;
  return token;
};

const accessToken = getStoredToken("accessToken");
const refreshToken = getStoredToken("refreshToken");

let parsedUser = null;
try {
  const storedUser = localStorage.getItem("user");
  if (storedUser && storedUser !== "null" && storedUser !== "undefined") {
    parsedUser = JSON.parse(storedUser);
  }
} catch {
  parsedUser = null;
  try { localStorage.removeItem("user"); } catch {}
}

const initialState: AuthState = {
  user: parsedUser,
  accessToken,
  refreshToken,
  isAuthenticated: !!accessToken,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<AuthResponse>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;

      const pcr = Boolean(
        action.payload.password_change_required ||
        action.payload.user?.password_change_required ||
        action.payload.data?.password_change_required
      );
      state.passwordChangeRequired = pcr;

      if (action.payload.user) {
        state.user = action.payload.user;
        localStorage.setItem("user", JSON.stringify(action.payload.user));
      }

      localStorage.setItem("accessToken", action.payload.accessToken);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
    },
    setTokens: (state, action: PayloadAction<AuthResponse>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;

      localStorage.setItem("accessToken", action.payload.accessToken);
      localStorage.setItem("refreshToken", action.payload.refreshToken);
    },
    setUser: (state, action: PayloadAction<EmployeeResponse>) => {
      state.user = action.payload;
      if (action.payload?.password_change_required !== undefined) {
        state.passwordChangeRequired = Boolean(action.payload.password_change_required);
      }
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    passwordChangeCompleted: (state) => {
      state.passwordChangeRequired = false;
      if (state.user) {
        state.user.password_change_required = false;
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.passwordChangeRequired = false;

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    },
  },
});

export const { loginSuccess, logout, setTokens, setUser, passwordChangeCompleted } = authSlice.actions;
export default authSlice.reducer;

