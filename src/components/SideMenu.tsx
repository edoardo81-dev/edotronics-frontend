import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getRole, isLoggedIn } from "../auth/auth.store";
import {
  getStockAlertsCount,
  refreshStockAlertsCount,
  subscribeStockAlertsCount,
} from "../admin/stockAlertsBadge.store";

export default function SideMenu() {
  if (!isLoggedIn()) return null;

  const { pathname } = useLocation();

  const role = getRole();
  const [alertsCount, setAlertsCount] = useState<number>(getStockAlertsCount());

  useEffect(() => {
    if (role !== "ADMIN") return;

    refreshStockAlertsCount().catch(() => {});
    const unsub = subscribeStockAlertsCount(setAlertsCount);

    // ✅ refresh leggero per cogliere nuovi alert creati da ordini
    const t = window.setInterval(() => {
      refreshStockAlertsCount().catch(() => {});
    }, 30000);

    return () => {
      unsub();
      window.clearInterval(t);
    };
  }, [role]);

  return (
    <aside className="edo-sidemenu" style={aside}>
      <div style={title}>
        {role === "ADMIN" ? "Menu Admin" : "Menu Utente"}
      </div>

      {role === "ADMIN" ? (
        <nav style={menu}>
          <Link to="/admin/orders" style={item(pathname.startsWith("/admin/orders"))}>
            Gestione ordini
          </Link>

          <Link to="/admin/products" style={item(pathname.startsWith("/admin/products"))}>
            Gestione prodotti
          </Link>

          <Link to="/admin/alerts" style={item(pathname.startsWith("/admin/alerts"))}>
            <div style={row}>
              <span style={rowText}>Stock alerts</span>
              {alertsCount > 0 && <span style={badge}>{alertsCount}</span>}
            </div>
          </Link>

          <Link to="/admin/promotions" style={item(pathname.startsWith("/admin/promotions"))}>
            Promozioni
          </Link>
        </nav>
      ) : (
        <nav style={menu}>
          <Link to="/me/orders" style={item(pathname.startsWith("/me/orders"))}>
            I miei ordini
          </Link>
        </nav>
      )}
    </aside>
  );
}

/* =========================
   STYLES — Black & Gold SideMenu
   ========================= */

const SIDE_W = 170;

const aside: React.CSSProperties = {
  width: SIDE_W,
  minWidth: SIDE_W,
  flex: `0 0 ${SIDE_W}px`,
  padding: 12,
  boxSizing: "border-box",

  /* ✅ tema */
  background: "rgba(0,0,0,0.72)",
  borderRight: "1px solid rgba(212,175,55,0.35)",
  boxShadow: "inset -1px 0 0 rgba(212,175,55,0.06)",
  backdropFilter: "blur(10px)",
};

const title: React.CSSProperties = {
  fontWeight: 900,
  marginBottom: 12,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",

  /* ✅ gold */
  color: "rgba(245,215,122,0.98)",
  letterSpacing: 0.3,
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
};

const menu: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 0,
};

const item = (active: boolean): React.CSSProperties => ({
  textDecoration: "none",
  display: "block",
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",

  /* ✅ “pill” menu */
  padding: "8px 10px",
  borderRadius: 12,
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: 0.15,

  color: active ? "#101216" : "rgba(255,255,255,0.82)",
  background: active
    ? "linear-gradient(180deg, rgba(245,215,122,0.95), rgba(212,175,55,0.95))"
    : "rgba(0,0,0,0.25)",
  border: active
    ? "1px solid rgba(0,0,0,0.25)"
    : "1px solid rgba(212,175,55,0.18)",

  boxShadow: active ? "0 14px 26px rgba(212,175,55,0.14)" : "none",

  transition: "0.12s ease",
});

/* riga per badge */
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  minWidth: 0,
};

const rowText: React.CSSProperties = {
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/* ✅ badge stock alert (rosso ma premium) */
const badge: React.CSSProperties = {
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  background: "rgba(208,0,0,0.92)",
  color: "white",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 900,
  padding: "0 6px",
  lineHeight: "18px",

  /* ✅ stacco su dark */
  border: "1px solid rgba(212,175,55,0.35)",
  boxShadow: "0 10px 18px rgba(0,0,0,0.45)",
};
