import { useState } from "react";

export default function GuestGate({ onContinue }: { onContinue: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12 }}>
      {/* bottone principale guest */}
      <button onClick={() => setOpen(true)} style={btnGuest}>
        Entra nel catalogo senza credenziali
      </button>

      {open && (
        <div
          style={backdrop}
          onClick={() => setOpen(false)} // ✅ click fuori = chiudi
        >
          <div
            style={modalCard}
            onClick={(e) => e.stopPropagation()} // ✅ click sul modal NON chiude
          >
            <h3 style={modalTitle}>Accesso come ospite</h3>

            <p style={modalText}>
              Puoi navigare il catalogo come ospite. Per effettuare acquisti dovrai registrarti e autenticarti.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setOpen(false)} style={btnOutline}>
                Annulla
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  onContinue();
                }}
                style={btnGold}
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   STILI BLACK & GOLD (INLINE → vince su tutto)
   ========================= */

const btnGuest: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
  color: "rgba(245,215,122,0.95)",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(212,175,55,0.55)",
  transition: "0.12s ease",
};

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999, // ✅ sopra tutto
  background: "rgba(0,0,0,0.72)", // ✅ molto più scuro (NO impasto)
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  backdropFilter: "blur(6px)",
};

const modalCard: React.CSSProperties = {
  width: "min(520px, 100%)",
  background: "rgba(0,0,0,0.92)", // ✅ non trasparente
  borderRadius: 16,
  padding: 16,
  border: "1px solid rgba(212,175,55,0.75)",
  boxShadow:
    "0 30px 70px rgba(0,0,0,0.85), 0 0 0 4px rgba(212,175,55,0.10)",
  color: "rgba(255,255,255,0.90)",
};

const modalTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  color: "rgba(245,215,122,0.98)",
  letterSpacing: 0.2,
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
};

const modalText: React.CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.5,
};

const btnOutline: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
  color: "rgba(245,215,122,0.95)",
  background: "rgba(0,0,0,0.25)",
  border: "1px solid rgba(212,175,55,0.55)",
};

const btnGold: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  fontWeight: 900,
  cursor: "pointer",
  color: "#101216",
  border: "0px",
  background: "linear-gradient(180deg, #f5d77a, #d4af37)",
  boxShadow: "0 14px 30px rgba(212,175,55,0.18)",
};
