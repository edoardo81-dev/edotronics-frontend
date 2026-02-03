import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import type { ProductCategory } from "../types/dto";
import {
  adminGetCategories,
  adminGetProductById,
  adminUpdateProduct,
  type UpdateProductDTO,
} from "../admin/adminProducts.service";
import { fmtMoney } from "../utils/money";

const categoryTitle: Record<string, string> = {
  SMARTPHONES: "Smartphones",
  PC_TABLETS: "PC & Tablets",
  MONITOR: "Monitor",
  SCANNER_STAMPANTI: "Scanner & Stampanti",
  ACCESSORI: "Accessori",
  USATO_RICONDIZIONATO: "Usato & Ricondizionato",
};

/**
 * ✅ Prezzo IT:
 * - "199,99" -> 199.99
 * - "1.299,50" -> 1299.50
 * - "1299.50" -> 1299.5
 */
function parseEuroNumber(raw: string): number | null {
  if (!raw) return null;

  let s = raw.trim();
  if (!s) return null;

  s = s.replace(/\s/g, "").replace(/€/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function AdminProductEditPage() {
  const nav = useNavigate();
  const params = useParams();

  const id = Number(params.id);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [loadingProd, setLoadingProd] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setLoadingCats(true);
    adminGetCategories()
      .then((res) => setCategories(res ?? []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, []);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setErr("ID prodotto non valido.");
      return;
    }

    setLoadingProd(true);
    setErr(null);
    setOk(null);

    adminGetProductById(id)
      .then((p) => {
        setName(p.name ?? "");
        setPrice(fmtMoney(p.price ?? 0));
        setImageUrl(p.imageUrl ?? "");
        setCategory((p.category as ProductCategory) ?? "");
      })
      .catch((e: any) => {
        const status = e?.response?.status;
        if (status === 401) setErr("Non autenticato. Fai login.");
        else if (status === 403) setErr("Accesso negato: serve ruolo ADMIN.");
        else setErr(e?.response?.data?.message ?? "Errore caricamento prodotto");
      })
      .finally(() => setLoadingProd(false));
  }, [id]);

  const canSubmit = useMemo(() => {
    if (!Number.isFinite(id) || id <= 0) return false;
    if (!name.trim()) return false;
    if (!category) return false;

    const p = parseEuroNumber(price);
    if (p == null || p <= 0) return false;

    if (!imageUrl.trim()) return false;

    return true;
  }, [id, name, price, imageUrl, category]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!Number.isFinite(id) || id <= 0) {
      setErr("ID prodotto non valido.");
      return;
    }

    const p = parseEuroNumber(price);
    if (p == null || p <= 0) {
      setErr("Prezzo non valido. Esempi: 199,99 oppure 1299.50 oppure 1.299,50");
      return;
    }

    if (!imageUrl.trim()) {
      setErr("Image URL obbligatoria.");
      return;
    }

    const payload: UpdateProductDTO = {
      name: name.trim(),
      price: p,
      imageUrl: imageUrl.trim(),
      category: category as ProductCategory,
    };

    setSaving(true);
    try {
      await adminUpdateProduct(id, payload);
      setOk("✅ Modifica salvata. Reindirizzo alla lista...");

      window.setTimeout(() => {
        nav("/admin/products");
      }, 600);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setErr("Non autenticato. Fai login.");
      else if (status === 403) setErr("Accesso negato: serve ruolo ADMIN.");
      else setErr(e?.response?.data?.message ?? "Errore aggiornamento prodotto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        <div style={header}>
          <h2 style={h2}>Admin - Modifica prodotto</h2>

          <button style={btnOutline} type="button" onClick={() => nav("/admin/products")}>
            ← Torna ai prodotti
          </button>
        </div>

        <div style={card}>
          {loadingCats && <div style={infoBox}>Caricamento categorie...</div>}
          {loadingProd && <div style={infoBox}>Caricamento prodotto...</div>}
          {err && <div style={warnBox}>{err}</div>}
          {ok && <div style={okBox}>{ok}</div>}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={lbl}>
              Nome prodotto
              <input value={name} onChange={(e) => setName(e.target.value)} style={ctrl} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={lbl}>
                Prezzo (€)
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  style={ctrl}
                  inputMode="decimal"
                  placeholder="es: 199,99"
                />
              </label>

              <label style={lbl}>
                Categoria
                <select
                  value={category ?? ""}
                  onChange={(e) => setCategory((e.target.value as ProductCategory) || "")}
                  style={selectStyle}
                  disabled={loadingCats}
                >
                  <option value="" style={optionStyle}>
                    Seleziona categoria...
                  </option>
                  {categories.map((c) => (
                    <option key={c} value={c} style={optionStyle}>
                      {categoryTitle[c] ?? c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={lbl}>
              Image URL
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={ctrl}
                placeholder="es: https://..."
              />
            </label>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button style={btnGold} type="submit" disabled={!canSubmit || saving || loadingProd}>
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </button>

              <button style={btnOutline} type="button" onClick={() => nav("/admin/products")} disabled={saving}>
                Annulla
              </button>
            </div>

            {!canSubmit && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                Compila almeno: <b>nome</b>, <b>categoria</b>, <b>prezzo &gt; 0</b>, <b>imageUrl</b>.
              </div>
            )}

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              Nota: la <b>quantità</b> si gestisce con <b>Restock</b>.
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

/* =========================
   STYLES — Black & Gold Admin Edit Product
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

const card: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.55)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
  width: "min(820px, 100%)",
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
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  color: "rgba(255,255,255,0.90)",
  outline: "none",
};

const infoBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(0,0,0,0.55)",
  marginBottom: 10,
  color: "rgba(255,255,255,0.82)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.35)",
};

const warnBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,140,140,0.22)",
  background: "rgba(176,0,32,0.22)",
  marginBottom: 10,
  color: "rgba(255,220,220,0.95)",
};

const okBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(212,175,55,0.12)",
  marginBottom: 10,
  color: "rgba(255,255,255,0.88)",
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

const selectStyle: React.CSSProperties = {
  ...ctrl,
  appearance: "auto",
};

const optionStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111111",
};
