import { api } from "../api/api";
import type { LoginRequest, LoginResponse } from "../types/dto";
import { setAuth, clearAuth, clearGuestAccess } from "./auth.store";

export type RegisterRequest = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
};

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const payload: LoginRequest = {
    username: req.username.trim(),
    password: req.password,
  };

  const { data } = await api.post<LoginResponse>("/api/auth/login", payload);
  setAuth(data.token, data.role);
  return data;
}

export async function register(req: RegisterRequest): Promise<LoginResponse> {
  const payload: RegisterRequest = {
    username: req.username.trim(),
    password: req.password,
    firstName: req.firstName.trim(),
    lastName: req.lastName.trim(),
    email: req.email.trim(),
    phone: req.phone.trim(),
    address: req.address.trim(),
    city: req.city.trim(),
  };

  const { data } = await api.post<LoginResponse>("/api/auth/register", payload);
  setAuth(data.token, data.role); // ✅ auto-login
  return data;
}

export function logout() {
  clearAuth();
  clearGuestAccess();
}
