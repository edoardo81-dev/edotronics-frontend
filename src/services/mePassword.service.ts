import { api } from "../api/api";

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export async function changeMyPassword(payload: ChangePasswordRequest): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>("/api/me/password", payload);
  return data;
}
