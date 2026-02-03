import { useEffect, useState } from "react";
import SideMenu from "../components/SideMenu";
import { ackAlert, getOpenAlerts } from "../admin/adminAlerts.service";
import type { StockAlertDTO } from "../types/dto";
import { setStockAlertsCount } from "../admin/stockAlertsBadge.store";

export default function AdminAlertsPage() {
  const [items, setItems] = useState<StockAlertDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await getOpenAlerts();
      const list = res ?? [];
      setItems(list);

      // ✅ aggiorna badge
      setStockAlertsCount(list.length);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setErr("Non autenticato. Fai login.");
      else if (status === 403) setErr("Accesso negato: serve ruolo ADMIN.");
      else setErr(e?.response?.data?.message ?? "Errore caricamento alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // ✅ auto refresh leggero (utile dopo ordini/restock)
    const t = window.setInterval(() => {
      load().catch(() => {});
    }, 15000);

    return () => window.clearInterval(t);
  }, []);

  async function onAck(id: number) {
    try {
      await ackAlert(id);
      await load(); // ✅ load aggiorna anche il contatore
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Errore ACK alert");
    }
  }

  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        <div style={header}>
          <h2 style={h2}>Admin - Stock alerts</h2>

          <button style={btnOutline} onClick={load} disabled={loading} type="button">
            {loading ? "Aggiorno..." : "Refresh"}
          </button>
        </div>

        {loading && <div style={infoBox}>Caricamento...</div>}
        {err && <div style={warnBox}>{err}</div>}

        {!loading && !err && items.length === 0 && (
          <div style={infoBox}>Nessun alert aperto.</div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((a) => (
            <div key={a.id} style={card}>
              <div style={rowTop}>
                <div style={{ minWidth: 260 }}>
                  <div style={cardTitle}>
                    #{a.id} — {a.productName}
                  </div>

                  <div style={cardSub}>
                    Qty: <b style={{ color: "rgba(245,215,122,0.98)" }}>{a.currentQuantity}</b>
                    {"  "}•{"  "}
                    Soglia: <b style={{ color: "rgba(245,215,122,0.98)" }}>{a.threshold}</b>
                    {"  "}•{"  "}
                    Stato: <b>{a.status}</b>
                  </div>

                  <div style={cardMeta}>Creato: {a.createdAt}</div>
                </div>

                <button style={btnGold} onClick={() => onAck(a.id)} type="button">
                  Chiudi avviso
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

/* =========================
   STYLES — Black & Gold
   ========================= */

const layout: React.CSSProperties = {
  display: "flex",
  minHeight: "calc(100vh - 52px)",
};

const main: React.CSSProperties = {
  flex: 1,
  padding: 14,
  color: "rgba(255,255,255,0.92)",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
  flexWrap: "wrap",
};

const h2: React.CSSProperties = {
  margin: 0,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const infoBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(0,0,0,0.55)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.40)",
  backdropFilter: "blur(10px)",
  marginBottom: 12,
  color: "rgba(255,255,255,0.84)",
};

const warnBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid rgba(255,140,140,0.25)",
  background: "rgba(176,0,32,0.22)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
  marginBottom: 12,
  color: "rgba(255,220,220,0.95)",
};

const card: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.55)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.40)",
  backdropFilter: "blur(10px)",
};

const rowTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const cardTitle: React.CSSProperties = {
  fontWeight: 950,
  color: "rgba(255,255,255,0.92)",
};

const cardSub: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.85,
  marginTop: 2,
  color: "rgba(255,255,255,0.78)",
};

const cardMeta: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.70,
  marginTop: 4,
  color: "rgba(255,255,255,0.65)",
};

const btnOutline: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.55)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(245,215,122,0.98)",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGold: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "0px",
  background: "linear-gradient(180deg, rgba(245,215,122,0.95), rgba(212,175,55,0.95))",
  color: "#101216",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 14px 26px rgba(212,175,55,0.14)",
};
