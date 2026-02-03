import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyOrders } from "../orders/orders.service";
import type { OrderDTO } from "../orders/orders.service";
import { isLoggedIn } from "../auth/auth.store";
import { fmtMoney } from "../utils/money";

export default function MyOrdersPage() {
  const nav = useNavigate();

  const [page, setPage] = useState(0);
  const [size] = useState(10);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const logged = isLoggedIn();

  useEffect(() => {
    if (!logged) return;

    let alive = true;
    setLoading(true);
    setErr(null);

    getMyOrders({ page, size, sort: "dateTime,desc" })
      .then((data) => {
        if (!alive) return;
        setOrders(data.content ?? []);
        setTotalPages(data.totalPages ?? 0);
      })
      .catch((e: any) => {
        const status = e?.response?.status;
        const msg = e?.response?.data?.message;

        if (status === 401) {
          setErr("Sessione scaduta o token non valido. Fai login di nuovo.");
          return;
        }
        setErr(msg ?? "Errore nel caricamento ordini");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [logged, page, size]);

  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  const title = useMemo(() => `I miei ordini`, []);

  if (!logged) {
    return (
      <div style={wrap}>
        <div style={card}>
          <h2 style={h2}>{title}</h2>
          <p style={{ marginTop: 6, color: "rgba(255,255,255,0.82)" }}>
            Devi autenticarti per vedere i tuoi ordini.
          </p>

          <button style={btnGold} onClick={() => nav("/login")} type="button">
            Vai al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ width: "min(980px, 100%)" }}>
        <h2 style={h2}>{title}</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <button
            style={{ ...btnOutline, opacity: !canPrev || loading ? 0.55 : 1 }}
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            type="button"
          >
            ◀ Prev
          </button>

          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
            Pagina <b style={{ color: "rgba(245,215,122,0.98)" }}>{totalPages === 0 ? 0 : page + 1}</b> /{" "}
            <b style={{ color: "rgba(245,215,122,0.98)" }}>{totalPages}</b>
          </div>

          <button
            style={{ ...btnOutline, opacity: !canNext || loading ? 0.55 : 1 }}
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
            type="button"
          >
            Next ▶
          </button>
        </div>

        {loading && <div style={infoBox}>Caricamento...</div>}
        {err && <div style={warnBox}>{err}</div>}

        {!loading && !err && orders.length === 0 && <div style={infoBox}>Nessun ordine trovato.</div>}

        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o) => (
            <OrderCard key={o.idOrder} order={o} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderDTO }) {
  const dt = safeDate(order.dateTime);

  const total = (order.products ?? []).reduce((sum, it) => {
    const unit = typeof it.price === "number" ? it.price : 0;
    return sum + unit * (it.orderedQuantity ?? 0);
  }, 0);

  return (
    <div style={orderCard}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, color: "rgba(245,215,122,0.98)" }}>
            Ordine #{order.idOrder}
          </div>
          <div style={{ fontSize: 13, opacity: 0.82, color: "rgba(255,255,255,0.72)" }}>
            {dt ? dt.toLocaleString() : order.dateTime}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 900, color: "rgba(245,215,122,0.98)" }}>Totale</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
            {fmtMoney(total)} €
          </div>
        </div>
      </div>

      {order.description && (
        <div style={noteBox}>
          <b style={{ color: "rgba(245,215,122,0.98)" }}>Note:</b>{" "}
          <span style={{ color: "rgba(255,255,255,0.86)" }}>{order.description}</span>
        </div>
      )}

      <div style={shipBox}>
        <b style={{ color: "rgba(245,215,122,0.98)" }}>Spedizione:</b>{" "}
        <span style={{ color: "rgba(255,255,255,0.86)" }}>
          {order.firstName} {order.lastName} — {order.address}, {order.city} — {order.phone}
        </span>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8, color: "rgba(245,215,122,0.98)" }}>
          Prodotti
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {(order.products ?? []).map((it, idx) => (
            <div key={`${it.productId}-${idx}`} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={prodName}>
                  {it.name ?? `Prodotto #${it.productId}`}
                </div>
                <div style={prodMeta}>
                  qty: <b style={{ color: "rgba(245,215,122,0.98)" }}>{it.orderedQuantity}</b> • prezzo:{" "}
                  {fmtMoney(it.price ?? 0)} €
                </div>
              </div>

              <div style={lineTotal}>
                {fmtMoney((it.price ?? 0) * (it.orderedQuantity ?? 0))} €
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function safeDate(iso: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/* =========================
   STYLES — Black & Gold MyOrders
   ========================= */

const wrap: React.CSSProperties = {
  display: "grid",
  placeItems: "start center",
  padding: 16,
  color: "rgba(255,255,255,0.92)",
};

const card: React.CSSProperties = {
  width: "min(560px, 100%)",
  borderRadius: 16,
  padding: 16,
  background: "rgba(0,0,0,0.60)",
  border: "1px solid rgba(212,175,55,0.30)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const h2: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 10,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const infoBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(0,0,0,0.55)",
  border: "1px solid rgba(212,175,55,0.25)",
  marginBottom: 12,
  color: "rgba(255,255,255,0.82)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.35)",
};

const warnBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "rgba(176,0,32,0.22)",
  border: "1px solid rgba(255,140,140,0.22)",
  marginBottom: 12,
  color: "rgba(255,220,220,0.95)",
};

const orderCard: React.CSSProperties = {
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.62)",
  border: "1px solid rgba(212,175,55,0.30)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const row: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  borderRadius: 12,
  padding: 10,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const prodName: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "rgba(255,255,255,0.92)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const prodMeta: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.8,
  color: "rgba(255,255,255,0.70)",
  marginTop: 2,
};

const lineTotal: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "rgba(245,215,122,0.98)",
  whiteSpace: "nowrap",
};

const noteBox: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  background: "rgba(212,175,55,0.10)",
  border: "1px solid rgba(212,175,55,0.22)",
};

const shipBox: React.CSSProperties = {
  marginTop: 10,
  fontSize: 13,
  opacity: 0.92,
  color: "rgba(255,255,255,0.86)",
};

const btnGold: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "0px",
  background: "linear-gradient(180deg, rgba(245,215,122,0.95), rgba(212,175,55,0.95))",
  color: "#101216",
  fontWeight: 950,
  cursor: "pointer",
  boxShadow: "0 14px 26px rgba(212,175,55,0.14)",
};

const btnOutline: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.55)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(245,215,122,0.98)",
  fontWeight: 900,
  cursor: "pointer",
};
