import axios from "axios";
import { clearAuth, getToken } from "../auth/auth.store";

// Vite env: set VITE_API_URL on deploy (e.g. https://your-backend.example.com)
// Local fallback: http://localhost:8080
const BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // token missing/invalid/expired
      clearAuth();
      // Do not force redirect here (avoid loops). UI handles it.
    }
    return Promise.reject(err);
  }
);
