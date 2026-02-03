import http from "../api/http";

export type InventoryEvent = {
  type?: string;      // es: "INVENTORY_CHANGED"
  reason?: string;    // es: "ORDER_CREATED" / "PRODUCT_UPDATED"
  at?: string;        // timestamp ISO dal backend
};

// Ricava base backend da axios baseURL (e normalizza eventuale /api finale)
function getBackendBaseUrl(): string {
  const raw = String(http?.defaults?.baseURL ?? "").trim();

  // Se non hai baseURL in axios, prova a usare direttamente 8080 (sviluppo)
  if (!raw) return "http://localhost:8080";

  let base = raw.endsWith("/") ? raw.slice(0, -1) : raw;

  // Se axios baseURL è ".../api", togli /api per costruire correttamente l'URL SSE
  if (base.endsWith("/api")) base = base.slice(0, -4);

  return base;
}

export function subscribeInventoryEvents(opts: {
  onInventory?: (ev: InventoryEvent) => void;
  onConnected?: (ev: any) => void;
  onOpen?: () => void;
  onError?: (err: any) => void;
}) {
  const base = getBackendBaseUrl();
  const url = `${base}/api/public/events/updates`;

  const es = new EventSource(url);

  es.onopen = () => {
    opts.onOpen?.();
  };

  es.onerror = (err) => {
    opts.onError?.(err);
  };

  // Evento "connected" (ping iniziale dal backend)
  es.addEventListener("connected", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data || "{}");
      opts.onConnected?.(data);
    } catch {
      opts.onConnected?.({ ok: true });
    }
  });

  // ✅ QUESTO è il nome corretto: "inventory-changed"
  es.addEventListener("inventory-changed", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data || "{}") as InventoryEvent;
      opts.onInventory?.(data);
    } catch {
      opts.onInventory?.({ reason: "UNKNOWN" });
    }
  });

  return () => {
    es.close();
  };
}
