import axios, { AxiosError } from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Global API Client configured with base URL, 
 * authentication headers, and standardized error handling.
 */
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Auth Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized Error Handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Unauthorized: Clear token and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("ngo_id");
      if (!window.location.pathname.includes("/login")) {
         window.location.href = "/";
      }
    } else if (status === 403) {
      // Forbidden: Access Denied
      console.error("Access Denied: You do not have permission to perform this action.");
    } else if (status && status >= 500) {
      // Server Error
      console.error("System Error: Please try again later.");
    }

    return Promise.reject(parseApiError(error));
  }
);

/**
 * Standardized error parser to extract meaningful messages 
 * from various backend error formats.
 */
function parseApiError(error: any): Error {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data;

    if (typeof payload === "string") return new Error(payload);
    
    // FastAPI detail format
    if (payload?.detail) {
      if (typeof payload.detail === "string") return new Error(payload.detail);
      if (Array.isArray(payload.detail) && payload.detail.length > 0) {
        const first = payload.detail[0];
        return new Error(typeof first === "string" ? first : first?.msg || "Validation error");
      }
      if (payload.detail.message) return new Error(payload.detail.message);
    }

    if (payload?.message) return new Error(payload.message);
    
    return new Error(error.message || "Request failed");
  }
  
  return error instanceof Error ? error : new Error("An unexpected error occurred");
}

export default api;
