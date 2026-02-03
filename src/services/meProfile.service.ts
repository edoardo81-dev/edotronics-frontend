import { api } from "../api/api";

export type MeProfileDTO = {
  username: string;
  role: string;

  firstName: string;
  lastName: string;

  email: string;
  phone: string;
  address: string;
  city: string;
};

export type UpdateMeProfileRequest = {
  email: string;
  phone: string;
  address: string;
  city: string;
};

export async function getMeProfile(): Promise<MeProfileDTO> {
  const { data } = await api.get<MeProfileDTO>("/api/me/profile");
  return data;
}

export async function updateMeProfile(payload: UpdateMeProfileRequest): Promise<MeProfileDTO> {
  const { data } = await api.put<MeProfileDTO>("/api/me/profile", payload);
  return data;
}
