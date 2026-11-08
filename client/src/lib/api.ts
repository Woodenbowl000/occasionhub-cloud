import axios from "axios";

/** Base URL of the Express API (set NEXT_PUBLIC_API_URL on Vercel). */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
).replace(/\/$/, "");

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("token");

/** Headers for code that calls the API with fetch() instead of axios. */
export const authHeaders = (extra: Record<string, string> = {}) => {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT issued by /auth/signin or /auth/signup
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired or invalid session: clear it and send the user to sign in
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/signin")) {
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
