import { fetchBaseQuery } from "@reduxjs/toolkit/query";
import type { RootState } from "../app/store";

export const baseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.accessToken;
        // 2. Add the skip-warning header for ngrok
        headers.set("ngrok-skip-browser-warning", "true");
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
        return headers;
    }
})