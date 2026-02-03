import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import { isLoggedIn } from "../auth/auth.store";
import { getMeProfile, updateMeProfile, type MeProfileDTO } from "../services/meProfile.service";
import { changeMyPassword } from "../services/mePassword.service";
import { logout } from "../auth/auth.service";

export default function ProfilePage() {
  if (!isLoggedIn()) {
    return (
      <div style={{ padding: 16, color: "rgba(255,255,255,0.85)" }}>
        Devi fare login.{" "}
        <Link to="/login" style={{ color: "rgba(245,215,122,0.98)", fontWeight: 900 }}>
          Vai al login
        </Link>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [profile, setProfile] = useState<MeProfileDTO | null>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  // ✅ cambio password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwOk, setPwOk] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const p = await getMeProfile();
      setProfile(p);
      setEmail(p.email ?? "");
      setPhone(p.phone ?? "");
      setAddress(p.address ?? "");
      setCity(p.city ?? "");
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setErr("Non autenticato. Fai login.");
      else setErr(e?.response?.data?.message ?? "Errore caricamento profilo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const updated = await updateMeProfile({
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
      });
      setProfile(updated);
      setOk("Modifiche salvate.");
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setErr(e?.response?.data?.message ?? "Email già in uso");
      else setErr(e?.response?.data?.message ?? "Errore salvataggio profilo");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwOk(null);
    setPwErr(null);

    const c = currentPassword;
    const n = newPassword;
    const cn = confirmNewPassword;

    if (!c || !n || !cn) {
      setPwErr("Compila tutti i campi password.");
      return;
    }
    if (n.length < 4) {
      setPwErr("La nuova password deve avere almeno 4 caratteri.");
      return;
    }
    if (n !== cn) {
      setPwErr("Le nuove password non coincidono.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await changeMyPassword({
        currentPassword: c,
        newPassword: n,
        confirmNewPassword: cn,
      });

      // ✅ messaggio post-logout (pagina login può leggerlo)
      sessionStorage.setItem("flash_msg", res?.message ?? "Password aggiornata. Effettua di nuovo il login.");

      // pulizia campi
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // ✅ logout automatico
      logout();
    } catch (e: any) {
      setPwErr(e?.response?.data?.message ?? "Errore cambio password");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        <div style={centerWrap}>
          <div style={{ width: "min(700px, 100%)" }}>
            <h2 style={h2}>Area personale</h2>

            <div style={card}>
              {loading && <div style={infoBox}>Caricamento...</div>}
              {err && <div style={warnBox}>{err}</div>}
              {ok && <div style={okBox}>{ok}</div>}

              {profile && !loading && (
                <>
                  <div style={topGrid}>
                    <div>
                      <b style={goldLabel}>Username:</b>{" "}
                      <span style={plainText}>{profile.username ?? "-"}</span>
                    </div>
                    <div>
                      <b style={goldLabel}>Ruolo:</b>{" "}
                      <span style={plainText}>{profile.role ?? "-"}</span>
                    </div>
                    <div>
                      <b style={goldLabel}>Nome:</b>{" "}
                      <span style={plainText}>{profile.firstName ?? "-"}</span>
                    </div>
                    <div>
                      <b style={goldLabel}>Cognome:</b>{" "}
                      <span style={plainText}>{profile.lastName ?? "-"}</span>
                    </div>
                  </div>

                  <form onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
                    <label style={lbl}>
                      Email
                      <input value={email} onChange={(e) => setEmail(e.target.value)} style={ctrl} />
                    </label>

                    <label style={lbl}>
                      Telefono
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} style={ctrl} />
                    </label>

                    <label style={lbl}>
                      Indirizzo e numero civico
                      <input value={address} onChange={(e) => setAddress(e.target.value)} style={ctrl} />
                    </label>

                    <label style={lbl}>
                      Città
                      <input value={city} onChange={(e) => setCity(e.target.value)} style={ctrl} />
                    </label>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button style={{ ...btnGold, opacity: saving ? 0.7 : 1 }} type="submit" disabled={saving}>
                        {saving ? "Salvataggio..." : "Salva modifiche"}
                      </button>

                      <button
                        style={{ ...btnOutline, opacity: loading || saving ? 0.55 : 1 }}
                        type="button"
                        onClick={load}
                        disabled={loading || saving}
                      >
                        Ripristina
                      </button>
                    </div>
                  </form>

                  <hr style={hr} />

                  <h3 style={h3}>Cambia password</h3>

                  {pwErr && <div style={warnBox}>{pwErr}</div>}
                  {pwOk && <div style={okBox}>{pwOk}</div>}

                  <form onSubmit={onChangePassword} style={{ display: "grid", gap: 10 }}>
                    <label style={lbl}>
                      Password attuale
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        style={ctrl}
                        autoComplete="current-password"
                      />
                    </label>

                    <label style={lbl}>
                      Nuova password
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={ctrl}
                        autoComplete="new-password"
                      />
                    </label>

                    <label style={lbl}>
                      Conferma nuova password
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        style={ctrl}
                        autoComplete="new-password"
                      />
                    </label>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button style={{ ...btnGold, opacity: pwSaving ? 0.7 : 1 }} type="submit" disabled={pwSaving}>
                        {pwSaving ? "Aggiornamento..." : "Aggiorna password"}
                      </button>
                    </div>

                    <div style={hintBox}>
                      Dopo l’aggiornamento password farai automaticamente <b>logout</b> e dovrai rientrare.
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* =========================
   STYLES — Black & Gold Profile
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

const centerWrap: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "center",
};

const h2: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const h3: React.CSSProperties = {
  margin: "0 0 10px 0",
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const card: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.30)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.62)",
  width: "min(520px, 100%)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const topGrid: React.CSSProperties = {
  display: "grid",
  gap: 6,
  marginBottom: 12,
  padding: 10,
  borderRadius: 12,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const goldLabel: React.CSSProperties = {
  color: "rgba(245,215,122,0.98)",
};

const plainText: React.CSSProperties = {
  color: "rgba(255,255,255,0.86)",
};

const lbl: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  color: "rgba(255,255,255,0.78)",
};

const ctrl: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.90)",
  outline: "none",
};

const infoBox: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(0,0,0,0.55)",
  marginBottom: 10,
  color: "rgba(255,255,255,0.82)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.35)",
};

const warnBox: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(255,140,140,0.22)",
  background: "rgba(176,0,32,0.22)",
  marginBottom: 10,
  color: "rgba(255,220,220,0.95)",
};

const okBox: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(212,175,55,0.12)",
  marginBottom: 10,
  color: "rgba(255,255,255,0.88)",
};

const hr: React.CSSProperties = {
  border: 0,
  borderTop: "1px solid rgba(212,175,55,0.28)",
  margin: "14px 0",
};

const hintBox: React.CSSProperties = {
  marginTop: 6,
  padding: 10,
  borderRadius: 12,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
};

const btnGold: React.CSSProperties = {
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
