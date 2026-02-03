import { api } from "../api/api";
import type { StockAlertDTO } from "../types/dto";

// Controller:
// GET  /api/admin/alerts
// GET  /api/admin/alerts/open/count
// POST /api/admin/alerts/{id}/ack

export async function getOpenAlerts(): Promise<StockAlertDTO[]> {
  const { data } = await api.get<StockAlertDTO[]>("/api/admin/alerts");
  return data;
}

export async function getOpenAlertsCount(): Promise<number> {
  const { data } = await api.get<number>("/api/admin/alerts/open/count");
  return data;
}

export async function ackAlert(id: number): Promise<StockAlertDTO> {
  const { data } = await api.post<StockAlertDTO>(`/api/admin/alerts/${id}/ack`);
  return data;
}
