import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import type { Page, ProductCategory, ProductDTO, ProductSalesView } from "../types/dto";
import {
  adminDeleteProduct,
  adminGetCategories,
  adminGetProducts,
  adminRestockProduct,
  adminLeastSelling,
  adminTopSelling,
} from "../admin/adminProducts.service";
import { refreshStockAlertsCount } from "../admin/stockAlertsBadge.store";
import { subscribeInventoryEvents } from "../realtime/appEvents";
import { fmtMoney } from "../utils/money";

const categoryTitle: Record<string, string> = {
  ALL: "Tutti",
  SMARTPHONES: "Smartphones",
  PC_TABLETS: "PC & Tablets",
  MONITOR: "Monitor",
  SCANNER_STAMPANTI: "Scanner & Stampanti",
  ACCESSORI: "Accessori",
  USATO_RICONDIZIONATO: "Usato & Ricondizionato",
};

type DeleteModalState = {
  open: boolean;
  productId: number | null;
};

type StockModalState = {
  open: boolean;
  product: ProductDTO | null;
  qtyText: string;
  mode: "ADD" | "REMOVE";
};

type StatsPeriod = "ALL" | "D7" | "D30";

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export default function AdminProductsPage() {
  const nav = useNavigate();

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<Page<ProductDTO> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState<{ type: "ok" | "warn"; text: string } | null>(null);

  const [delModal, setDelModal] = useState<DeleteModalState>({
    open: false,
    productId: null,
  });

  const [stockModal, setStockModal] = useState<StockModalState>({
    open: false,
    product: null,
    qtyText: "1",
    mode: "ADD",
  });

  // ===================== STATS =====================
  const [statsOpen, setStatsOpen] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("ALL");
  const [statsLimit, setStatsLimit] = useState<3 | 5 | 10>(3);
  const [topSelling, setTopSelling] = useState<ProductSalesView[]>([]);
  const [leastSelling, setLeastSelling] = useState<ProductSalesView[]>([]);

  const title = useMemo(() => (category ? categoryTitle[category] ?? category : "Tutti"), [category]);

  useEffect(() => {
    adminGetCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  async function load(p: number) {
    setLoading(true);
    setErr(null);
    try {
      const res = await adminGetProducts({
        q,
        category,
        page: p,
        size: 10,
        sort: "name,asc",
      });
      setData(res);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setErr("Non autenticato. Fai login.");
      else if (status === 403) setErr("Accesso negato: serve ruolo ADMIN.");
      else setErr(e?.response?.data?.message ?? "Errore caricamento prodotti (admin)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, page]);

  function periodToDays(p: StatsPeriod): number | undefined {
    if (p === "D7") return 7;
    if (p === "D30") return 30;
    return undefined;
  }

  async function loadStats() {
    if (!statsOpen) return;

    setStatsLoading(true);
    setErr(null);

    const days = periodToDays(statsPeriod);

    try {
      const [top, least] = await Promise.all([
        adminTopSelling({ limit: statsLimit, days }),
        adminLeastSelling({ limit: statsLimit, days }),
      ]);

      setTopSelling(top ?? []);
      setLeastSelling(least ?? []);
    } catch (e: any) {
      const status = e?.response?.status;

      if ((statsPeriod === "D7" || statsPeriod === "D30") && (status === 400 || status === 404)) {
        setMsg({
          type: "warn",
          text: "Il backend non supporta ancora il filtro periodo (7/30 giorni). Mostro statistiche 'Sempre'.",
        });
        setStatsPeriod("ALL");
        return;
      }

      setErr(e?.response?.data?.message ?? "Errore caricamento statistiche");
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsOpen, statsPeriod, statsLimit]);

  // ===================== SSE =====================
  const refreshTimerRef = useRef<number | null>(null);

  function scheduleRealtimeRefresh() {
    if (refreshTimerRef.current != null) window.clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = window.setTimeout(async () => {
      try {
        await Promise.all([loadStats(), load(page), refreshStockAlertsCount()]);
      } catch {
        // no-op
      }
    }, 200);
  }

  useEffect(() => {
    const unsubscribe = subscribeInventoryEvents({
      onOpen: () => {},
      onConnected: () => {},
      onInventory: () => scheduleRealtimeRefresh(),
      onError: () => {},
    });

    return () => {
      unsubscribe?.();
      if (refreshTimerRef.current != null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================== DELETE =====================
  function askDelete(id: number) {
    setMsg(null);
    setDelModal({ open: true, productId: id });
  }

  async function confirmDelete() {
    const id = delModal.productId;
    if (!id) return;

    setErr(null);
    setMsg(null);

    try {
      await adminDeleteProduct(id);
      setDelModal({ open: false, productId: null });
      setMsg({ type: "ok", text: `✅ Prodotto #${id} eliminato.` });
      await load(page);
      await refreshStockAlertsCount();
      await loadStats();
    } catch (e: any) {
      setDelModal({ open: false, productId: null });
      setErr(e?.response?.data?.message ?? "Errore eliminazione prodotto");
    }
  }

  // ===================== STOCK MODAL =====================
  function openStockDialog(p: ProductDTO) {
    setErr(null);
    setMsg(null);
    setStockModal({
      open: true,
      product: p,
      qtyText: "1",
      mode: "ADD",
    });
  }

  function closeStockDialog() {
    setStockModal({ open: false, product: null, qtyText: "1", mode: "ADD" });
  }

  async function confirmStockChange() {
    const p = stockModal.product;
    if (!p) return;

    const raw = stockModal.qtyText.trim();
    const n = Number(raw);

    if (!raw || !Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      setMsg({ type: "warn", text: "Quantità non valida. Inserisci un intero > 0." });
      return;
    }

    const delta = stockModal.mode === "ADD" ? n : -n;

    const nextQtyPreview = p.quantity + delta;
    if (nextQtyPreview < 0) {
      setMsg({
        type: "warn",
        text: `Operazione non valida: lo stock andrebbe sotto 0 (attuale ${p.quantity}).`,
      });
      return;
    }

    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      await adminRestockProduct(p.productId, delta);

      closeStockDialog();
      setMsg({
        type: "ok",
        text:
          delta > 0
            ? `✅ Stock aumentato di ${n} per #${p.productId}.`
            : `✅ Stock diminuito di ${n} per #${p.productId}.`,
      });

      await load(page);
      await refreshStockAlertsCount();
      await loadStats();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Errore aggiornamento stock");
    } finally {
      setLoading(false);
    }
  }

  const totalPages = data?.totalPages ?? 0;
  const canPrev = page > 0;
  const canNext = totalPages > 0 && page + 1 < totalPages;

  const stockPreview = useMemo(() => {
    const p = stockModal.product;
    if (!p) return null;
    const n = Number(stockModal.qtyText);
    if (!Number.isFinite(n) || n <= 0) return { current: p.quantity, next: p.quantity };
    const delta = stockModal.mode === "ADD" ? Math.floor(n) : -Math.floor(n);
    return { current: p.quantity, next: p.quantity + delta };
  }, [stockModal]);

  const statsLabel = useMemo(() => {
    if (statsPeriod === "D7") return "Ultimi 7 giorni";
    if (statsPeriod === "D30") return "Ultimi 30 giorni";
    return "Sempre";
  }, [statsPeriod]);

  // ✅ STILE DEL SELETTORE (SEGMENTED CONTROL)
  const addSelected = stockModal.mode === "ADD";
  const removeSelected = stockModal.mode === "REMOVE";

  const addStyle: React.CSSProperties = {
    ...segBtnBase,
    ...(addSelected ? segBtnGoldActive : segBtnInactive),
  };

  const removeStyle: React.CSSProperties = {
    ...segBtnBase,
    ...(removeSelected ? segBtnRedActive : segBtnInactive),
  };

  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        <div style={header}>
          <h2 style={h2}>Admin - Prodotti</h2>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              placeholder="Cerca..."
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
              style={ctrl}
            />

            <select
              value={category ?? ""}
              onChange={(e) => {
                setPage(0);
                setCategory((e.target.value || null) as ProductCategory | null);
              }}
              style={selectStyle}
            >
              <option value="" style={optionStyle}>
                Categoria: Tutti
              </option>

              {categories.map((c) => (
                <option key={c} value={c} style={optionStyle}>
                  {categoryTitle[c] ?? c}
                </option>
              ))}
            </select>

            <div style={{ fontSize: 13, opacity: 0.8, color: "rgba(255,255,255,0.75)" }}>
              Filtro: <b style={{ color: "rgba(245,215,122,0.98)" }}>{title}</b>
            </div>
          </div>
        </div>

        {/* ===================== STATS BOX ===================== */}
        <div style={statsBox}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>📊 Statistiche vendite</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                Periodo: <b style={{ color: "rgba(245,215,122,0.98)" }}>{statsLabel}</b> • Mostra:{" "}
                <b style={{ color: "rgba(245,215,122,0.98)" }}>Top {statsLimit}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button style={btnOutline} type="button" onClick={() => setStatsOpen((x) => !x)}>
                {statsOpen ? "Nascondi" : "Mostra"}
              </button>
            </div>
          </div>

          {statsOpen && (
            <>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Periodo</div>

                <button style={statsPeriod === "ALL" ? btnGold : btnOutline} type="button" onClick={() => setStatsPeriod("ALL")}>
                  Sempre
                </button>
                <button style={statsPeriod === "D7" ? btnGold : btnOutline} type="button" onClick={() => setStatsPeriod("D7")}>
                  Ultimi 7
                </button>
                <button style={statsPeriod === "D30" ? btnGold : btnOutline} type="button" onClick={() => setStatsPeriod("D30")}>
                  Ultimi 30
                </button>

                <div style={{ width: 12 }} />

                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Top</div>
                <button style={statsLimit === 3 ? btnGold : btnOutline} type="button" onClick={() => setStatsLimit(3)}>
                  3
                </button>
                <button style={statsLimit === 5 ? btnGold : btnOutline} type="button" onClick={() => setStatsLimit(5)}>
                  5
                </button>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={statsCard}>
                  <div style={{ fontWeight: 950, marginBottom: 8, color: "rgba(245,215,122,0.98)" }}>Top venduti</div>

                  {statsLoading ? (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Caricamento...</div>
                  ) : topSelling.length === 0 ? (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>Nessun dato.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {topSelling.map((it, idx) => (
                        <div key={`${it.productId}-${idx}`} style={statsRow}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(255,255,255,0.90)" }}>
                              #{it.productId} — {it.name}
                            </div>
                          </div>
                          <div style={{ fontWeight: 950, fontSize: 13, whiteSpace: "nowrap", color: "rgba(245,215,122,0.98)" }}>
                            {it.totalSold}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={statsCard}>
                  <div style={{ fontWeight: 950, marginBottom: 8, color: "rgba(245,215,122,0.98)" }}>Meno venduti</div>

                  {statsLoading ? (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Caricamento...</div>
                  ) : leastSelling.length === 0 ? (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>Nessun dato.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {leastSelling.map((it, idx) => (
                        <div key={`${it.productId}-${idx}`} style={statsRow}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(255,255,255,0.90)" }}>
                              #{it.productId} — {it.name}
                            </div>
                          </div>
                          <div style={{ fontWeight: 950, fontSize: 13, whiteSpace: "nowrap", color: "rgba(245,215,122,0.98)" }}>
                            {it.totalSold}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {loading && <div style={infoBox}>Caricamento...</div>}
        {err && <div style={warnBox}>{err}</div>}
        {msg && <div style={msg.type === "ok" ? okBox : warnBox}>{msg.text}</div>}

        <div style={{ display: "grid", gap: 10 }}>
          {(data?.content ?? []).map((p) => (
            <div key={p.productId} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                {/* ✅ BLOCCO SINISTRO con MINIATURA */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 260 }}>
                  <img
                    src={p.imageUrl || "/images/products/placeholder.jpg"}
                    alt={p.name}
                    style={adminThumb}
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (!el.src.includes("/images/products/placeholder.jpg")) {
                        el.src = "/images/products/placeholder.jpg";
                      }
                    }}
                  />

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.92)" }}>
                      #{p.productId} — <span style={{ color: "rgba(245,215,122,0.98)" }}>{p.name}</span>
                    </div>

                    <div style={{ fontSize: 13, opacity: 0.9, color: "rgba(255,255,255,0.78)" }}>
                      Categoria: <b style={{ color: "rgba(245,215,122,0.98)" }}>{categoryTitle[p.category] ?? p.category}</b> • Qty:{" "}
                      <b style={{ color: "rgba(245,215,122,0.98)" }}>{p.quantity}</b>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.80)" }}>
                      Prezzo: <b style={{ color: "rgba(245,215,122,0.98)" }}>€ {fmtMoney(p.discountedPrice ?? p.price)}</b>
                      {p.promoActive && (
                        <>
                          {" "}
                          <span style={{ textDecoration: "line-through", opacity: 0.65 }}>€ {fmtMoney(p.oldPrice ?? p.price)}</span>{" "}
                          <span style={{ fontSize: 12, opacity: 0.85, color: "rgba(255,255,255,0.72)" }}>
                            ({p.promoName} -{p.discountPercent}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button style={btnOutline} onClick={() => nav(`/admin/products/${p.productId}/edit`)} type="button">
                    Modifica
                  </button>

                  <button style={btnOutline} onClick={() => openStockDialog(p)} type="button">
                    Correggi stock
                  </button>

                  <button style={btnDanger} onClick={() => askDelete(p.productId)} type="button">
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div style={pager}>
            <button
              style={{ ...btnOutline, opacity: !canPrev || loading ? 0.55 : 1 }}
              disabled={!canPrev || loading}
              onClick={() => setPage((x) => Math.max(0, x - 1))}
              type="button"
            >
              ◀ Prev
            </button>

            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              Pagina <b style={{ color: "rgba(245,215,122,0.98)" }}>{page + 1}</b> /{" "}
              <b style={{ color: "rgba(245,215,122,0.98)" }}>{totalPages}</b>
            </span>

            <button
              style={{ ...btnOutline, opacity: !canNext || loading ? 0.55 : 1 }}
              disabled={!canNext || loading}
              onClick={() => setPage((x) => x + 1)}
              type="button"
            >
              Next ▶
            </button>
          </div>
        )}

        {/* ===================== MODAL ELIMINA ===================== */}
        {delModal.open && (
          <div style={modalOverlay} role="dialog" aria-modal="true">
            <div style={modalCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>Conferma eliminazione</div>
                <button style={iconBtn} type="button" onClick={() => setDelModal({ open: false, productId: null })}>
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                Eliminare definitivamente il prodotto <b>#{delModal.productId}</b>?
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button style={btnOutline} type="button" onClick={() => setDelModal({ open: false, productId: null })} disabled={loading}>
                  Annulla
                </button>

                <button style={btnDangerFilled} type="button" onClick={confirmDelete} disabled={loading}>
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== MODAL STOCK ===================== */}
        {stockModal.open && stockModal.product && (
          <div style={modalOverlay} role="dialog" aria-modal="true">
            <div style={modalCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>Correzione stock</div>
                <button style={iconBtn} type="button" onClick={closeStockDialog}>
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                Prodotto: <b>#{stockModal.product.productId}</b> — {stockModal.product.name}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {/* ✅ SELETTORE */}
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>
                    Azione:
                    <b style={{ marginLeft: 6, color: addSelected ? "rgba(245,215,122,0.98)" : "rgba(255,140,140,0.95)" }}>
                      {addSelected ? "AGGIUNGI" : "RIMUOVI"}
                    </b>
                  </div>

                  <div style={segWrap}>
                    <input
                      id="stock_mode_add"
                      type="radio"
                      name="stock_mode"
                      checked={addSelected}
                      onChange={() => setStockModal((s) => ({ ...s, mode: "ADD" }))}
                      style={srOnly}
                      disabled={loading}
                    />
                    <label htmlFor="stock_mode_add" style={addStyle}>
                      ➕ AGGIUNGI
                    </label>

                    <input
                      id="stock_mode_remove"
                      type="radio"
                      name="stock_mode"
                      checked={removeSelected}
                      onChange={() => setStockModal((s) => ({ ...s, mode: "REMOVE" }))}
                      style={srOnly}
                      disabled={loading}
                    />
                    <label htmlFor="stock_mode_remove" style={removeStyle}>
                      ➖ RIMUOVI
                    </label>
                  </div>
                </div>

                <label style={lbl}>
                  Quantità
                  <input
                    style={ctrl}
                    inputMode="numeric"
                    value={stockModal.qtyText}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, "");
                      const normalized = v === "" ? "" : String(clampInt(Number(v), 1, 999999));
                      setStockModal((s) => ({ ...s, qtyText: normalized }));
                    }}
                    placeholder="es: 5"
                    disabled={loading}
                  />
                </label>

                {stockPreview && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                    Stock attuale: <b style={{ color: "rgba(245,215,122,0.98)" }}>{stockPreview.current}</b> • Nuovo stock:{" "}
                    <b style={{ color: "rgba(245,215,122,0.98)" }}>{stockPreview.next}</b>
                    {stockPreview.next < 0 && (
                      <span style={{ marginLeft: 8, color: "rgba(255,140,140,0.95)", fontWeight: 900 }}>(non valido)</span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button style={btnOutline} type="button" onClick={closeStockDialog} disabled={loading}>
                    Chiudi
                  </button>
                  <button style={btnGold} type="button" onClick={confirmStockChange} disabled={loading}>
                    Conferma
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* =========================
   STYLES — Black & Gold Admin Products
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

const ctrl: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  width: 220,
  maxWidth: "70vw",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.90)",
  outline: "none",
};

const adminThumb: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 12,
  objectFit: "cover",
  objectPosition: "center",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.25)",
  flex: "0 0 auto",
};

const infoBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(0,0,0,0.55)",
  marginBottom: 12,
  color: "rgba(255,255,255,0.82)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.35)",
};

const warnBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,140,140,0.22)",
  background: "rgba(176,0,32,0.22)",
  marginBottom: 12,
  color: "rgba(255,220,220,0.95)",
};

const okBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(212,175,55,0.12)",
  marginBottom: 12,
  color: "rgba(255,255,255,0.88)",
};

const statsBox: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.30)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(0,0,0,0.60)",
  marginBottom: 12,
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const statsCard: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(0,0,0,0.35)",
};

const statsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: "10px 10px",
  background: "rgba(0,0,0,0.25)",
};

const card: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.55)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
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

const btnDanger: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,140,140,0.45)",
  background: "rgba(176,0,32,0.18)",
  color: "rgba(255,220,220,0.95)",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDangerFilled: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,140,140,0.45)",
  background: "rgba(176,0,32,0.92)",
  color: "white",
  fontWeight: 950,
  cursor: "pointer",
};

const pager: React.CSSProperties = {
  margin: "14px 0",
  display: "flex",
  justifyContent: "center",
  gap: 10,
  alignItems: "center",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.65)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: "min(560px, 100%)",
  background: "rgba(0,0,0,0.75)",
  borderRadius: 16,
  border: "1px solid rgba(212,175,55,0.30)",
  padding: 14,
  boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
  backdropFilter: "blur(12px)",
  color: "rgba(255,255,255,0.90)",
};

const iconBtn: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.55)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(245,215,122,0.98)",
  borderRadius: 12,
  width: 34,
  height: 34,
  cursor: "pointer",
  fontWeight: 900,
};

const lbl: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  color: "rgba(255,255,255,0.78)",
};

/* ====== segmented selector styles ====== */
const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};

const segWrap: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.30)",
};

const segBtnBase: React.CSSProperties = {
  padding: "10px 12px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontWeight: 950,
  userSelect: "none",
  transition: "all .15s ease",
};

const segBtnInactive: React.CSSProperties = {
  color: "rgba(245,215,122,0.98)",
  background: "rgba(0,0,0,0.20)",
  borderRight: "1px solid rgba(255,255,255,0.10)",
};

const segBtnGoldActive: React.CSSProperties = {
  color: "#101216",
  background: "linear-gradient(180deg, rgba(245,215,122,0.95), rgba(212,175,55,0.95))",
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
};

const segBtnRedActive: React.CSSProperties = {
  color: "white",
  background: "rgba(176,0,32,0.95)",
  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
};

const selectStyle: React.CSSProperties = {
  ...ctrl,
  appearance: "auto",
};

const optionStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#111111",
};
