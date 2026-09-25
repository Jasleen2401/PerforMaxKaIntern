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
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    },
  },
});

export const { loginSuccess, logout, setTokens,setUser } = authSlice.actions;
export default authSlice.reducer;
