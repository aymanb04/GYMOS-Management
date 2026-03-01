import axios from "axios";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
});

// Attach Bearer token to every request if present
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

/**
 * Call this after login.
 * Writes to both localStorage (for API calls) and a cookie
 * (so Next.js middleware can read it server-side for route protection).
 */
export function setAuthTokens(accessToken: string): void {
    localStorage.setItem("accessToken", accessToken);
    document.cookie = `gymos_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

/**
 * Call this on logout or when a 401 is received.
 * Clears localStorage and the cookie.
 */
export function clearAuthTokens(): void {
    localStorage.removeItem("accessToken");
    document.cookie = "gymos_token=; path=/; max-age=0";
}