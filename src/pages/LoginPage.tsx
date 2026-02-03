import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GuestGate from "../components/GuestGate";
import { login, register, type RegisterRequest } from "../auth/auth.service";
import { setGuestAccess } from "../auth/auth.store";

export default function LoginPage() {
  const nav = useNavigate();

  const formRef = useRef<HTMLFormElement | null>(null);

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const cityRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<"login" | "register">("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPwd, setShowPwd] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"ok" | "warn">("warn");
  const [loading, setLoading] = useState(false);

  function resetAllFields() {
    setUsername("");
    setPassword("");
    setShowPwd(false);

    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setCity("");

    setMsg(null);
    setMsgKind("warn");
  }

  function switchMode(next: "login" | "register") {
    resetAllFields();
    setMode(next);
    window.setTimeout(() => usernameRef.current?.focus(), 0);
  }

  useEffect(() => {
    const flash = sessionStorage.getItem("flash_msg");
    if (flash) {
      setMsgKind("ok");
      setMsg(flash);
      sessionStorage.removeItem("flash_msg");
      setMode("login");
    }
  }, []);

  useEffect(() => {
    if (msgKind !== "ok" || !msg) return;
    const t = window.setTimeout(() => {
      setMsg(null);
      setMsgKind("warn");
    }, 6000);
    return () => window.clearTimeout(t);
  }, [msgKind, msg]);

  async function onLogin() {
    setMsg(null);
    setMsgKind("warn");
    setLoading(true);
    try {
      await login({ username, password });
      nav("/products");
    } catch (e: any) {
      setMsgKind("warn");
      setMsg(e?.response?.data?.message ?? "Login fallito");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister() {
    setMsg(null);
    setMsgKind("warn");

    const payload: RegisterRequest = {
      username,
      password,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
    };

    setLoading(true);
    try {
      await register(payload);
      nav("/products");
    } catch (e: any) {
      setMsgKind("warn");
      setMsg(e?.response?.data?.message ?? "Registrazione fallita");
    } finally {
      setLoading(false);
    }
  }

  function handleEnterNext(
    e: React.KeyboardEvent<HTMLInputElement>,
    next?: React.RefObject<HTMLInputElement | null>,
    submitIfLast?: boolean
  ) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();

    if (submitIfLast) {
      formRef.current?.requestSubmit();
      return;
    }
    next?.current?.focus();
  }

  // posizionamento: puoi ritoccare qui senza far muovere lo sfondo
  const topLogin = "clamp(260px, 14vh, 340px)";
  const topRegister = "clamp(265px, 12vh, 340px)";

  return (
    <div className="edo-bg edo-login-shell" style={shell}>
      {/* ====== BACKGROUND FIXED LAYER (non si muove mai) ====== */}
      <div
        aria-hidden="true"
        style={{
          ...bgFixed,
          backgroundImage: 'url("/images/products/edotronics-login-bg.png")',
        }}
      />

      {/* overlay fixed per leggibilità */}
      <div className="edo-login-overlay" style={overlayFixed} aria-hidden="true" />

      {/* ====== SCROLL CONTAINER (scrolla la pagina, non la card) ====== */}
      <div
        className="edo-login-scroll"
        style={{
          ...scrollContainer,
          paddingTop: mode === "login" ? topLogin : topRegister,
        }}
      >
        <div style={formArea}>
          {/* stelline */}
          <div className="edo-starfield" aria-hidden="true">
            <span className="edo-star small" style={{ left: -54, top: 40, animationDelay: "0.1s" }}>
              ✦
            </span>
            <span className="edo-star med" style={{ left: -74, top: 115, animationDelay: "0.5s" }}>
              ✦
            </span>
            <span className="edo-star big" style={{ left: -50, top: 210, animationDelay: "1.0s" }}>
              ✦
            </span>

            <span className="edo-star small" style={{ right: -54, top: 52, animationDelay: "0.2s" }}>
              ✦
            </span>
            <span className="edo-star med" style={{ right: -78, top: 135, animationDelay: "0.7s" }}>
              ✦
            </span>
            <span className="edo-star big" style={{ right: -46, top: 240, animationDelay: "1.2s" }}>
              ✦
            </span>
          </div>

          <style>{`
            /* overlay come da tua versione */
            .edo-login-overlay { background: rgba(0,0,0,0.38); }
            @media (max-width: 860px) { .edo-login-overlay { background: rgba(0,0,0,0.55); } }
            @media (max-width: 520px) { .edo-login-overlay { background: rgba(0,0,0,0.68); } }

            .edo-login-card {
              background: rgba(0,0,0,0.55);
              border: 1px solid rgba(212,175,55,0.28);
              backdrop-filter: blur(10px);
              box-shadow: 0 18px 50px rgba(0,0,0,0.55);
            }

            @media (max-width: 520px) {
              .edo-login-card { background: rgba(0,0,0,0.62); backdrop-filter: blur(12px); }
              .edo-starfield { display: none !important; }
            }
          `}</style>

          <div className="edo-card edo-login-card" style={card}>
            <h2 style={{ marginTop: 0, color: "var(--text)" }}>{mode === "login" ? "Accedi" : "Registrati"}</h2>

            <div className="edo-tabbar" style={{ marginBottom: 12 }}>
              <button
                type="button"
                className={`edo-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Login
              </button>

              <button
                type="button"
                className={`edo-tab ${mode === "register" ? "active" : ""}`}
                onClick={() => switchMode("register")}
              >
                Registrazione
              </button>
            </div>

            <form
              ref={formRef}
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                mode === "login" ? onLogin() : onRegister();
              }}
              onKeyDownCapture={(e) => {
                if (e.key !== "Enter") return;

                const target = e.target as HTMLElement | null;
                const tag = target?.tagName?.toLowerCase();
                if (tag === "textarea") return;

                if (
                  target === usernameRef.current ||
                  target === passwordRef.current ||
                  target === firstNameRef.current ||
                  target === lastNameRef.current ||
                  target === emailRef.current ||
                  target === phoneRef.current ||
                  target === addressRef.current ||
                  target === cityRef.current
                ) {
                  return;
                }

                e.preventDefault();
                formRef.current?.requestSubmit();
              }}
            >
              <label style={lbl}>Username</label>
              <input
                ref={usernameRef}
                name="username"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="edo-input"
                style={inp}
                onKeyDown={(e) => handleEnterNext(e, passwordRef)}
              />

              <label style={lbl}>Password</label>

              <div style={pwdWrap}>
                <input
                  ref={passwordRef}
                  type={showPwd ? "text" : "password"}
                  name="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="edo-input"
                  style={inpPwd}
                  onKeyDown={(e) => {
                    if (mode === "login" && e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      formRef.current?.requestSubmit();
                      return;
                    }
                    if (mode === "register") {
                      handleEnterNext(e, firstNameRef);
                    }
                  }}
                />

                <button
                  type="button"
                  className="edo-icon-btn"
                  style={monkeyBtn}
                  onClick={() => setShowPwd((v) => !v)}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  title={showPwd ? "Nascondi password" : "Mostra password"}
                  aria-label={showPwd ? "Nascondi password" : "Mostra password"}
                >
                  {showPwd ? "🐵" : "🙈"}
                </button>
              </div>

              {mode === "register" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                    <div>
                      <label style={lbl}>Nome</label>
                      <input
                        ref={firstNameRef}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="edo-input"
                        style={inp}
                        onKeyDown={(e) => handleEnterNext(e, lastNameRef)}
                      />
                    </div>

                    <div>
                      <label style={lbl}>Cognome</label>
                      <input
                        ref={lastNameRef}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="edo-input"
                        style={inp}
                        onKeyDown={(e) => handleEnterNext(e, emailRef)}
                      />
                    </div>
                  </div>

                  <label style={lbl}>Email</label>
                  <input
                    ref={emailRef}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="edo-input"
                    style={inp}
                    onKeyDown={(e) => handleEnterNext(e, phoneRef)}
                  />

                  <label style={lbl}>Telefono</label>
                  <input
                    ref={phoneRef}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="edo-input"
                    style={inp}
                    onKeyDown={(e) => handleEnterNext(e, addressRef)}
                  />

                  <label style={lbl}>Indirizzo e numero civico</label>
                  <input
                    ref={addressRef}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="edo-input"
                    style={inp}
                    onKeyDown={(e) => handleEnterNext(e, cityRef)}
                  />

                  <label style={lbl}>Città</label>
                  <input
                    ref={cityRef}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="edo-input"
                    style={inp}
                    onKeyDown={(e) => handleEnterNext(e, undefined, true)}
                  />
                </>
              )}

              {msg && <div style={msgKind === "ok" ? okMsgStyle : msgStyle}>{msg}</div>}

              <button type="submit" disabled={loading} className="edo-btn-primary" style={btnPrimary}>
                {mode === "login" ? (loading ? "Accesso..." : "Login") : loading ? "Creazione..." : "Crea account"}
              </button>
            </form>

            <div className="edo-guest" style={{ marginTop: 12 }}>
              <GuestGate
                onContinue={() => {
                  setGuestAccess();
                  nav("/products", { replace: true });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== layout ===== */

const shell: React.CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  overflowX: "hidden",  // ok
  overflowY: "visible", // ✅ la pagina può scrollare
};


/**
 * Sfondo fisso vero:
 * - sta fuori dallo scroll container
 * - NON si muove passando login/register
 */
const bgFixed: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center 20%",
  backgroundSize: "80% auto", // ✅ ~20% più piccolo
  backgroundColor: "#070707",
  transform: "translateZ(0)",
};

const overlayFixed: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 1,
};

/**
 * Questo è IL punto del fix:
 * - è lui a scrollare (pagina intera)
 * - la card NON avrà mai scrollbar
 */
const scrollContainer: React.CSSProperties = {
  position: "relative",
  zIndex: 2,

  // ✅ IMPORTANTISSIMO: niente scroll interno
  height: "auto",
  overflowY: "visible",
  overflowX: "hidden",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  padding: 16,
  paddingBottom: "clamp(24px, 6vh, 64px)",
};


const formArea: React.CSSProperties = {
  position: "relative",
  width: "min(560px, 100%)",
};

const card: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  padding: 16,
  position: "relative",
  zIndex: 2,
  overflow: "visible", // ✅ mai scroll interno
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  marginTop: 10,
  marginBottom: 4,
  color: "rgba(255,255,255,0.72)",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "0px",
};

const pwdWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
  alignItems: "center",
};

const inpPwd: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "0px",
};

const monkeyBtn: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
  lineHeight: 1,
};

const msgStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "rgba(212,175,55,0.12)",
  border: "1px solid rgba(212,175,55,0.35)",
  color: "rgba(255,255,255,0.86)",
};

const okMsgStyle: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "rgba(60, 150, 60, 0.18)",
  border: "1px solid rgba(140, 255, 140, 0.18)",
  color: "rgba(220,255,220,0.95)",
};

const btnPrimary: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  padding: "10px 12px",
};
