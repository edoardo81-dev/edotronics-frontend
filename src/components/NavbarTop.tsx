import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getRole, getUsernameFromToken, isLoggedIn } from "../auth/auth.store";
import { logout } from "../auth/auth.service";

export default function NavbarTop() {
  const nav = useNavigate();
  const { pathname } = useLocation();

  const logged = isLoggedIn();
  const role = getRole();
  const username = getUsernameFromToken();

  const isAdmin = logged && role === "ADMIN";
  const isUser = logged && role === "USER";

  const [logoutHover, setLogoutHover] = React.useState(false);

  return (
    <div style={bar}>
      {/* LEFT */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link to="/products" style={navLink(pathname === "/products")}>
          Catalogo
        </Link>

        {/* Area personale only for USER */}
        {isUser && (
          <Link to="/profile" style={navLink(pathname === "/profile")}>
            Area personale
          </Link>
        )}

        {/* Mobile-only quick access to My Orders when SideMenu is hidden */}
        {isUser && (
          <Link
            to="/me/orders"
            className="edo-mobile-only"
            style={navLink(pathname.startsWith("/me/orders"))}
          >
            Ordini
          </Link>
        )}

        {/* New product link only for ADMIN */}
        {isAdmin && (
          <Link
            to="/admin/products/new"
            style={navLink(pathname.startsWith("/admin/products/new"))}
          >
            Nuovo prodotto
          </Link>
        )}
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!logged ? (
          <>
            <span style={badgeGuest}>OSPITE</span>
            <Link to="/login" style={btnGoldLink}>
              Login
            </Link>
          </>
        ) : (
          <>
            <span style={badgeUser}>
              <span style={{ opacity: 0.95 }}>
                {username ? `Benvenuto/a ${username}` : "Benvenuto"}
              </span>
              {role && <span style={badgeRole}>{role}</span>}
            </span>

            <button
              style={logoutHover ? btnGoldHover : btnOutline}
              onMouseEnter={() => setLogoutHover(true)}
              onMouseLeave={() => setLogoutHover(false)}
              onClick={() => {
                logout();
                nav("/login", { replace: true });
              }}
              type="button"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================
   STYLES — Black & Gold Navbar
   ========================= */

const bar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  padding: "10px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(0,0,0,0.78)",
  borderBottom: "1px solid rgba(212,175,55,0.40)",
  boxShadow: "0 14px 30px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const navLink = (active: boolean): React.CSSProperties => ({
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: 0.2,

  color: active ? "rgba(245,215,122,0.98)" : "rgba(255,255,255,0.80)",
  padding: "6px 10px",
  borderRadius: 999,

  border: active ? "1px solid rgba(212,175,55,0.55)" : "1px solid transparent",
  background: active ? "rgba(212,175,55,0.10)" : "transparent",
});

const badgeGuest: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: 0.4,

  color: "rgba(245,215,122,0.98)",
  background: "rgba(0,0,0,0.60)",
  border: "1px solid rgba(212,175,55,0.75)",
  boxShadow: "0 14px 28px rgba(0,0,0,0.45), 0 0 0 4px rgba(212,175,55,0.08)",
};

const badgeUser: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,

  color: "rgba(245,215,122,0.98)",
  background: "rgba(0,0,0,0.60)",
  border: "1px solid rgba(212,175,55,0.55)",
  boxShadow: "0 14px 28px rgba(0,0,0,0.45)",
};

const badgeRole: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.4,

  color: "#101216",
  background: "linear-gradient(180deg, #f5d77a, #d4af37)",
  border: "1px solid rgba(0,0,0,0.25)",
};

const btnGoldLink: React.CSSProperties = {
  textDecoration: "none",
  padding: "8px 12px",
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 13,

  color: "#101216",
  background: "linear-gradient(180deg, #f5d77a, #d4af37)",
  border: "0px",
  boxShadow: "0 14px 26px rgba(212,175,55,0.16)",
};

const btnOutline: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",

  color: "rgba(245,215,122,0.98)",
  background: "rgba(0,0,0,0.30)",
  border: "1px solid rgba(212,175,55,0.55)",
};

const btnGoldHover: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  fontWeight: 900,
  fontSize: 13,
};
