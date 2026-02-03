import { getOpenAlertsCount } from "./adminAlerts.service";

let _count = 0;
const listeners = new Set<(n: number) => void>();

export function getStockAlertsCount() {
  return _count;
}

export function setStockAlertsCount(n: number) {
  _count = Math.max(0, Number.isFinite(n) ? n : 0);
  listeners.forEach((cb) => cb(_count));
}

export function subscribeStockAlertsCount(cb: (n: number) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function refreshStockAlertsCount() {
  const n = await getOpenAlertsCount();
  setStockAlertsCount(n);
}
