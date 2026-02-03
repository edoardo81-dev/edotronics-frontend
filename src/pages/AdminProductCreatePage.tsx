import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import type { ProductCategory } from "../types/dto";
import {
  adminCreateProduct,
  adminGetCategories,
  type CreateProductDTO,
} from "../admin/adminProducts.service";

const categoryTitle: Record<string, string> = {
  SMARTPHONES: "Smartphones",
  PC_TABLETS: "PC & Tablets",
  MONITOR: "Monitor",
  SCANNER_STAMPANTI: "Scanner & Stampanti",
  ACCESSORI: "Accessori",
  USATO_RICONDIZIONATO: "Usato & Ricondizionato",
};

const BG = "#0b0b0b";
const PANEL = "#121212";
const BORDER = "rgba(212,175,55,0.25)";
const BORDER_STRONG = "rgba(212,175,55,0.55)";
const GOLD = "#D4AF37";
const TXT = "rgba(255,255,255,0.92)";
const MUTED = "rgba(255,255,255,0.72)";
const OK = "#49d17d";
const DANGER = "#E35050";

type FieldKey = "name" | "price" | "quantity" | "imageUrl" | "category";

/**
 * ✅ input prezzo italiano:
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

/**
 * ✅ hint UX (non blocco definitivo): caratteri consentiti e formato comune
 */
function getPriceInputHint(raw: string): string | null {
  const v = raw ?? "";
  if (!v.trim()) return null;

  const invalid = v.match(/[^0-9.,\s€]/g);
  if (invalid) return "Nel prezzo usa solo numeri e separatori (virgola o punto).";

  const commas = (v.match(/,/g) ?? []).length;
  const dots = (v.match(/\./g) ?? []).length;
  if (commas > 1 && dots === 0)
    return "Formato non valido. Esempi: 199,99 oppure 1299.50 oppure 1.299,50";
  if (commas > 1 && dots > 0) return "Formato non valido. Esempi: 1.299,50";

  const parsed = parseEuroNumber(v);
  if (parsed == null)
    return "Prezzo non valido. Esempi: 199,99 oppure 1299.50 oppure 1.299,50";

  return null;
}

function validateAll(values: {
  name: string;
  price: string;
  quantity: string;
  imageUrl: string;
  category: ProductCategory | "";
}): Partial<Record<FieldKey, string>> {
  const next: Partial<Record<FieldKey, string>> = {};

  if (!values.name.trim()) next.name = "Il nome è obbligatorio.";

  if (!values.price.trim()) next.price = "Il prezzo è obbligatorio.";
  else {
    const p = parseEuroNumber(values.price);
    if (p == null) next.price = "Prezzo non valido. Esempi: 199,99 oppure 1299.50 oppure 1.299,50";
    else if (p <= 0) next.price = "Il prezzo deve essere maggiore di 0.";
  }

  if (!values.quantity.trim()) next.quantity = "La quantità è obbligatoria.";
  else {
    const q = Number(values.quantity);
    if (!Number.isFinite(q)) next.quantity = "Quantità non valida.";
    else if (q < 0) next.quantity = "La quantità deve essere ≥ 0.";
  }

  if (!values.imageUrl.trim()) next.imageUrl = "L’immagine (URL) è obbligatoria.";

  if (!values.category) next.category = "La categoria è obbligatoria.";

  return next;
}

export default function AdminProductCreatePage() {
  const nav = useNavigate();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // values
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<ProductCategory | "">("");

  const [saving, setSaving] = useState(false);

  // ✅ MOSTRA ERRORI SOLO DOPO IL CLICK SU "CREA PRODOTTO"
  const [showValidation, setShowValidation] = useState(false);

  // backend messages
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setLoadingCats(true);
    adminGetCategories()
      .then((res) => setCategories(res ?? []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingCats(false));
  }, []);

  const values = useMemo(
    () => ({ name, price, quantity, imageUrl, category }),
    [name, price, quantity, imageUrl, category]
  );

  // ✅ errori sempre aggiornati (coerenti), ma visualizzati solo se showValidation=true
  const errors = useMemo(() => validateAll(values), [values]);
  const canSubmit = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const priceHint = useMemo(() => getPriceInputHint(price), [price]);

  function showError(k: FieldKey) {
    return showValidation && !!errors[k];
  }

  function controlStyle(k: FieldKey): React.CSSProperties {
    return {
      ...ctrl,
      border: showError(k) ? "1px solid rgba(227,80,80,0.55)" : ctrl.border,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    // ✅ al primo click attivo la validazione
    setShowValidation(true);

    // ✅ se ci sono errori, non invio nulla
    if (Object.keys(errors).length > 0) return;

    const payload: CreateProductDTO = {
      name: name.trim(),
      price: parseEuroNumber(price)!,
      quantity: Number(quantity),
      imageUrl: imageUrl.trim(),
      category: category as ProductCategory,
    };

    setSaving(true);
    try {
      const created = await adminCreateProduct(payload);
      setOk(`✅ Prodotto creato (#${created.productId}). Reindirizzo alla lista...`);

      window.setTimeout(() => {
        nav("/admin/products");
      }, 600);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setErr("Non autenticato. Fai login.");
      else if (status === 403) setErr("Accesso negato: serve ruolo ADMIN.");
      else setErr(e?.response?.data?.message ?? "Errore creazione prodotto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        <div style={header}>
          <div>
            <h2 style={{ margin: 0, color: TXT, fontWeight: 950 }}>
              Admin · <span style={{ color: GOLD }}>Nuovo prodotto</span>
            </h2>
            <div style={{ color: MUTED, marginTop: 4, fontSize: 13 }}>
              Gli avvisi compaiono quando clicchi <b style={{ color: TXT }}>Crea prodotto</b>.
            </div>
          </div>

          <button style={btnGhost} type="button" onClick={() => nav("/admin/products")}>
            ← Torna ai prodotti
          </button>
        </div>

        <div style={card}>
          {loadingCats && <div style={infoBox}>Caricamento categorie...</div>}
          {err && <div style={warnBox}>{err}</div>}
          {ok && <div style={okBox}>{ok}</div>}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            {/* NAME */}
            <label style={lbl}>
              <span style={lblTitle}>Nome prodotto</span>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (err) setErr(null);
                  if (ok) setOk(null);
                }}
                style={controlStyle("name")}
                placeholder="Es: iPhone 15 Pro"
              />
              {showError("name") && <div style={fieldWarn}>{errors.name}</div>}
            </label>

            {/* PRICE + QTY */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={lbl}>
                <span style={lblTitle}>Prezzo (€)</span>
                <input
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (err) setErr(null);
                    if (ok) setOk(null);
                  }}
                  style={controlStyle("price")}
                  inputMode="decimal"
                  placeholder="es: 199,99"
                />
                {!showValidation && priceHint && <div style={hintWarn}>{priceHint}</div>}
                {showError("price") && <div style={fieldWarn}>{errors.price}</div>}
              </label>

              <label style={lbl}>
                <span style={lblTitle}>Quantità</span>
                <input
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    if (err) setErr(null);
                    if (ok) setOk(null);
                  }}
                  style={controlStyle("quantity")}
                  inputMode="numeric"
                  placeholder="es: 10"
                />
                {showError("quantity") && <div style={fieldWarn}>{errors.quantity}</div>}
              </label>
            </div>

            {/* IMAGE */}
            <label style={lbl}>
              <span style={lblTitle}>Image URL</span>
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (err) setErr(null);
                  if (ok) setOk(null);
                }}
                style={controlStyle("imageUrl")}
                placeholder="es: https://..."
              />
              {showError("imageUrl") && <div style={fieldWarn}>{errors.imageUrl}</div>}

              {imageUrl?.trim() ? (
                <div style={previewWrap}>
                  <div style={previewTitle}>Preview immagine</div>
                  <div style={previewBox}>
                    <img
                      src={imageUrl.trim()}
                      alt="preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </label>

            {/* CATEGORY */}
            <label style={lbl}>
              <span style={lblTitle}>Categoria</span>
              <select
                value={category}
                onChange={(e) => {
                  setCategory((e.target.value as ProductCategory) || "");
                  if (err) setErr(null);
                  if (ok) setOk(null);
                }}
                style={controlStyle("category")}
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
              {showError("category") && <div style={fieldWarn}>{errors.category}</div>}
            </label>

            {/* ACTIONS */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button style={btnPrimary} type="submit" disabled={saving}>
                {saving ? "Creazione..." : "Crea prodotto"}
              </button>

              <button
                style={btnGhost}
                type="button"
                onClick={() => {
                  setErr(null);
                  setOk(null);
                  setName("");
                  setPrice("");
                  setQuantity("1");
                  setImageUrl("");
                  setCategory("");
                  setShowValidation(false);
                }}
                disabled={saving}
              >
                Reset
              </button>
            </div>

            {showValidation && !canSubmit && (
              <div style={{ fontSize: 12, color: MUTED }}>
                Correggi i campi evidenziati in rosso per continuare.
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}

/* ---------------- STYLES (BLACK & GOLD) ---------------- */

const layout: React.CSSProperties = {
  display: "flex",
  minHeight: "calc(100vh - 52px)",
  background: BG,
};

const main: React.CSSProperties = {
  flex: 1,
  padding: 14,
  background: BG,
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 12,
  marginBottom: 12,
  flexWrap: "wrap",
};

const card: React.CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  padding: 14,
  background: PANEL,
  width: "min(760px, 100%)",
  boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
};

const lbl: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  color: MUTED,
};

const lblTitle: React.CSSProperties = {
  color: MUTED,
  fontSize: 12,
};

const ctrl: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
  background: "rgba(255,255,255,0.03)",
  color: TXT,
  outline: "none",
};

const optionStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111111",
};

const infoBox: React.CSSProperties = {
  padding: 10,
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: "rgba(255,255,255,0.02)",
  marginBottom: 10,
  color: MUTED,
};

const warnBox: React.CSSProperties = {
  padding: 10,
  borderRadius: 14,
  border: `1px solid rgba(227,80,80,0.40)`,
  background: "rgba(227,80,80,0.12)",
  marginBottom: 10,
  color: DANGER,
  fontWeight: 800,
};

const okBox: React.CSSProperties = {
  padding: 10,
  borderRadius: 14,
  border: `1px solid rgba(73,209,125,0.35)`,
  background: "rgba(73,209,125,0.10)",
  marginBottom: 10,
  color: OK,
  fontWeight: 800,
};

const hintWarn: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: GOLD,
  background: "rgba(212,175,55,0.10)",
  border: `1px solid rgba(212,175,55,0.35)`,
  padding: "8px 10px",
  borderRadius: 12,
};

const fieldWarn: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: DANGER,
  background: "rgba(227,80,80,0.12)",
  border: "1px solid rgba(227,80,80,0.40)",
  padding: "8px 10px",
  borderRadius: 12,
  fontWeight: 800,
};

const btnGhost: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: `1px solid ${BORDER}`,
  background: "transparent",
  color: GOLD,
  cursor: "pointer",
  fontWeight: 900,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 14,
  border: `1px solid ${BORDER_STRONG}`,
  background: GOLD,
  color: "#0b0b0b",
  cursor: "pointer",
  fontWeight: 950,
};

const previewWrap: React.CSSProperties = {
  marginTop: 8,
  display: "grid",
  gap: 8,
};

const previewTitle: React.CSSProperties = {
  fontSize: 12,
  color: MUTED,
};

const previewBox: React.CSSProperties = {
  height: 190,
  borderRadius: 18,
  border: `1px solid ${BORDER}`,
  background: "rgba(255,255,255,0.02)",
  overflow: "hidden",
};
