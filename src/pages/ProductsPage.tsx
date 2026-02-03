import type React from "react";
import { useEffect, useMemo, useState } from "react";
import BottomCategoryNav from "../components/BottomCategoryNav";
import SideMenu from "../components/SideMenu";
import type { Page, ProductCategory, ProductDTO } from "../types/dto";
import { getCategories, getProducts } from "../services/product.service";
import { getRole, isLoggedIn } from "../auth/auth.store";
import { createMyOrder } from "../orders/orders.service";
import { fmtMoney } from "../utils/money";

const categoryTitle: Record<string, string> = {
  ALL: "Tutti i prodotti",
  SMARTPHONES: "Smartphones",
  PC_TABLETS: "PC & Tablets",
  MONITOR: "Monitor",
  SCANNER_STAMPANTI: "Scanner & Stampanti",
  ACCESSORI: "Accessori",
  USATO_RICONDIZIONATO: "Usato & Riccondizionato",
};

type CartState = Record<number, number>; // productId -> qty
type PickState = Record<number, number>; // productId -> qty-to-add (selettore)

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export default function ProductsPage() {
  const logged = isLoggedIn();
  const role = logged ? getRole() : null;

  // ✅ carrello SOLO per USER
  const canShop = logged && role === "USER";

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<Page<ProductDTO> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ carrello (rimane nello state ma UI e logica si attivano solo se canShop)
  const [cart, setCart] = useState<CartState>({});
  const [pickQty, setPickQty] = useState<PickState>({});

  const [note, setNote] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);

  const [productCache, setProductCache] = useState<Record<number, ProductDTO>>({});



  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 860px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 860px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();

    // Safari fallback
    // @ts-ignore
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    // @ts-ignore
    else mq.addListener(onChange);

    return () => {
      // @ts-ignore
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      // @ts-ignore
      else mq.removeListener(onChange);
    };
  }, []);
  const title = useMemo(() => (category ? categoryTitle[category] : categoryTitle.ALL), [category]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // ✅ se non posso comprare, pulisco eventuali residui
  useEffect(() => {
    if (!canShop) {
      setCart({});
      setPickQty({});
      setNote("");
      setCheckoutMsg(null);
    }
  }, [canShop]);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    getProducts({ q, category, page, size: 10, sort: "name,asc" })
      .then((res) => {
        setData(res);

        // cache prodotti sempre aggiornata (serve comunque per prezzi)
        const entries: Record<number, ProductDTO> = {};
        (res.content ?? []).forEach((p) => {
          entries[p.productId] = p;
        });
        setProductCache((prev) => ({ ...prev, ...entries }));

        // ✅ tutto ciò che riguarda carrello/picker SOLO se canShop
        if (!canShop) return;

        // ✅ FIX: picker parte da 0 (non da 1)
        setPickQty((prev) => {
          const next = { ...prev };
          (res.content ?? []).forEach((p) => {
            if (next[p.productId] == null) next[p.productId] = 0;
          });
          return next;
        });

        setCart((prev) => {
          let changed = false;
          const next = { ...prev };
          (res.content ?? []).forEach((p) => {
            const inCart = next[p.productId] ?? 0;
            if (inCart > p.quantity) {
              changed = true;
              const newQty = Math.max(0, p.quantity);
              if (newQty === 0) delete next[p.productId];
              else next[p.productId] = newQty;
            }
          });
          return changed ? next : prev;
        });
      })
      .catch((e: any) => setErr(e?.response?.data?.message ?? "Errore caricamento prodotti"))
      .finally(() => setLoading(false));
  }, [q, category, page, canShop]);

  function incPick(productId: number, maxAdd: number) {
    setPickQty((prev) => {
      const cur = prev[productId] ?? 0;
      return { ...prev, [productId]: clamp(cur + 1, 0, maxAdd) };
    });
  }

  function decPick(productId: number) {
    setPickQty((prev) => {
      const cur = prev[productId] ?? 0;
      return { ...prev, [productId]: clamp(cur - 1, 0, 9999) };
    });
  }

  function addToCart(product: ProductDTO, qtyToAdd: number) {
    if (!canShop) return;

    setCheckoutMsg(null);

    const pid = product.productId;

    // ✅ FIX: se qtyToAdd è 0 non faccio nulla
    const toAdd = Math.max(0, qtyToAdd);
    if (toAdd <= 0) return;

    setCart((prev) => {
      const currentInCart = prev[pid] ?? 0;
      const maxStock = product.quantity;

      if (maxStock <= 0) return prev;

      const maxAdd = Math.max(0, maxStock - currentInCart);
      const safeToAdd = clamp(toAdd, 1, Math.max(1, maxAdd));

      const nextQty = clamp(currentInCart + safeToAdd, 1, maxStock);
      if (nextQty === currentInCart) return prev;

      return { ...prev, [pid]: nextQty };
    });

    // ✅ FIX: reset picker a 0 dopo l'aggiunta
    setPickQty((prev) => ({ ...prev, [pid]: 0 }));
  }

  function incCart(pid: number) {
    if (!canShop) return;

    setCheckoutMsg(null);
    setCart((prev) => {
      const current = prev[pid] ?? 0;
      const maxStock = productCache[pid]?.quantity ?? current;
      if (current + 1 > maxStock) return prev;
      return { ...prev, [pid]: current + 1 };
    });
  }

  function decCart(pid: number) {
    if (!canShop) return;

    setCheckoutMsg(null);
    setCart((prev) => {
      const next = { ...prev };
      const current = next[pid] ?? 0;
      const newQty = Math.max(0, current - 1);
      if (newQty === 0) delete next[pid];
      else next[pid] = newQty;
      return next;
    });
  }

  function clearCart() {
    setCart({});
    setNote("");
    setCheckoutMsg(null);
  }

  const cartItems = useMemo(() => {
    const items = Object.entries(cart)
      .map(([pid, qty]) => ({ productId: Number(pid), qty }))
      .filter((x) => x.qty > 0);

    return items.sort((a, b) => {
      const an = productCache[a.productId]?.name ?? "";
      const bn = productCache[b.productId]?.name ?? "";
      return an.localeCompare(bn);
    });
  }, [cart, productCache]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, it) => {
      const p = productCache[it.productId];
      const unit = p ? (p.discountedPrice ?? p.price) : 0;
      return sum + unit * it.qty;
    }, 0);
  }, [cartItems, productCache]);

  async function checkout() {
    if (!canShop) return;

    setCheckoutMsg(null);
    if (cartItems.length === 0) {
      setCheckoutMsg("Carrello vuoto.");
      return;
    }

    setCheckoutLoading(true);
    try {
      await createMyOrder({
        description: note.trim() ? note.trim() : null,
        products: cartItems.map((it) => ({
          productId: it.productId,
          orderedQuantity: it.qty,
        })),
      });

      clearCart();
      setCheckoutMsg("✅ Ordine creato! Vai su “I miei ordini” per vederlo.");

      setPage(0);
      getProducts({ q, category, page: 0, size: 10, sort: "name,asc" })
        .then((res) => {
          setData(res);
          const entries: Record<number, ProductDTO> = {};
          (res.content ?? []).forEach((p) => (entries[p.productId] = p));
          setProductCache((prev) => ({ ...prev, ...entries }));
        })
        .catch(() => {});
    } catch (e: any) {
      setCheckoutMsg(e?.response?.data?.message ?? "Errore creazione ordine");
    } finally {
      setCheckoutLoading(false);
    }
  }

  const contentGridStyle: React.CSSProperties = (() => {
    const base: React.CSSProperties = canShop ? contentGrid : { ...contentGrid, gridTemplateColumns: "1fr" };
    // On mobile we always want a single column layout (cart below the catalog)
    if (isMobile) return { ...base, gridTemplateColumns: "1fr" };
    return base;
  })();

  const cartCardStyle: React.CSSProperties = isMobile
    ? { ...cartCard, position: "relative", top: "auto", width: "100%" }
    : cartCard;


  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        <div style={header}>
          <h2 style={h2}>{title}</h2>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              placeholder="Cerca prodotto..."
              value={q}
              onChange={(e) => {
                setPage(0);
                setQ(e.target.value);
              }}
              style={search}
            />
          </div>
        </div>

        {!logged && (
          <div style={warnBox}>
            Stai navigando come <b>guest</b>. Puoi vedere il catalogo, ma per acquistare devi autenticarti come <b>USER</b>.
          </div>
        )}

        {loading && <div style={{ padding: 12, color: "rgba(255,255,255,0.75)" }}>Caricamento...</div>}
        {err && <div style={errBox}>{err}</div>}

        <div style={contentGridStyle}>
          {/* CATALOGO */}
          <section style={{ minWidth: 0 }}>
            <div style={grid}>
              {data?.content?.map((p) => {
                const inCart = canShop ? (cart[p.productId] ?? 0) : 0;

                // ✅ FIX: maxAdd può essere 0, e pick parte da 0
                const maxAdd = Math.max(0, p.quantity - inCart);
                const pick = clamp(pickQty[p.productId] ?? 0, 0, maxAdd);

                // ✅ FIX: aggiungo SOLO se pick > 0
                const canAdd = canShop && p.quantity > inCart && pick > 0;

                const promoOn = !!p.promoActive && p.discountedPrice != null;
                const old = (p.oldPrice ?? p.price) as number;
                const finalPrice = promoOn ? p.discountedPrice! : p.price;

                return (
                  <div key={p.productId} style={cardWrap}>
                    {/* ✅ NOME PROMO SOPRA LA CARD */}
                    <div style={promoTopSlot}>
                      <div style={{ ...promoTop, visibility: promoOn && p.promoName ? "visible" : "hidden" }}>
                        {p.promoName || "SPACER"}
                      </div>
                    </div>

                    <div style={card}>
                      {promoOn && <div style={promoBadge}>-{p.discountPercent ?? 0}%</div>}

                      {/* ✅ IMG frame fisso (no stretch quando c'è 1 sola card) */}
                      <div style={imgFrame}>
                        <img
                          src={p.imageUrl || "/images/products/placeholder.jpg"}
                          alt={p.name}
                          style={img}
                          loading="lazy"
                          onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            if (!el.src.includes("/images/products/placeholder.jpg")) {
                              el.src = "/images/products/placeholder.jpg";
                            }
                          }}
                        />
                      </div>

                      <div style={productName} title={p.name}>
                        {p.name}
                      </div>

                      <div style={{ marginTop: 10 }}>
                        {promoOn ? (
                          <div style={priceBox}>
                            <div style={oldPriceBand}>
                              <span style={{ opacity: 0.85, marginRight: 6 }}>Prima</span>
                              <span style={oldPriceText}>€ {fmtMoney(old)}</span>
                            </div>

                            <div style={newPriceBand}>
                              <span style={{ opacity: 0.95, marginRight: 8 }}>Ora</span>
                              <span style={newPriceText}>€ {fmtMoney(finalPrice)}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={plainPrice}>€ {fmtMoney(p.price)}</div>
                        )}
                      </div>

                      <div style={availability}>
                        Disponibilità: {p.quantity}
                        {canShop && inCart > 0 && (
                          <>
                            {" "}
                            • nel carrello: <b>{inCart}</b>
                          </>
                        )}
                      </div>

                      {/* ✅ carrello/picker SOLO per USER */}
                      {canShop && (
                        <>
                          <div style={pickRow}>
                            <button
                              style={{ ...btnOutlineSmall, opacity: pick <= 0 ? 0.5 : 1 }}
                              onClick={() => decPick(p.productId)}
                              disabled={pick <= 0}
                              type="button"
                            >
                              −
                            </button>

                            <div style={pickValue}>{pick}</div>

                            <button
                              style={{ ...btnOutlineSmall, opacity: pick >= maxAdd ? 0.5 : 1 }}
                              onClick={() => incPick(p.productId, maxAdd)}
                              disabled={pick >= maxAdd}
                              type="button"
                            >
                              +
                            </button>

                            <button
                              style={{
                                ...btnGold,
                                flex: 1,
                                padding: "10px 8px",
                                opacity: canAdd ? 1 : 0.55,
                                cursor: canAdd ? "pointer" : "not-allowed",
                              }}
                              onClick={() => addToCart(p, pick)}
                              disabled={!canAdd}
                              type="button"
                            >
                              Aggiungi
                            </button>
                          </div>

                          {maxAdd === 0 && <div style={noAddNote}>Prodotto esaurito o già tutto in carrello.</div>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {data && (
              <div style={pager}>
                <button style={{ ...btnOutline, opacity: data.first ? 0.5 : 1 }} disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))} type="button">
                  Prev
                </button>

                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  Pagina {data.number + 1} di {data.totalPages}
                </span>

                <button style={{ ...btnOutline, opacity: data.last ? 0.5 : 1 }} disabled={data.last} onClick={() => setPage((p) => p + 1)} type="button">
                  Next
                </button>
              </div>
            )}
          </section>

          {/* ✅ CARRELLO SOLO PER USER */}
          {canShop && (
            <aside style={cartCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h3 style={h3}>Carrello</h3>
                <button type="button" style={{ ...btnOutline, padding: "8px 10px", width: "auto", opacity: cartItems.length === 0 ? 0.5 : 1 }} onClick={clearCart} disabled={cartItems.length === 0}>
                  Svuota
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div style={{ padding: 10, opacity: 0.75, color: "rgba(255,255,255,0.70)" }}>Carrello vuoto</div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {cartItems.map((it) => {
                    const p = productCache[it.productId];
                    const unit = p ? (p.discountedPrice ?? p.price) : 0;
                    const maxStock = p?.quantity ?? it.qty;

                    return (
                      <div key={it.productId} style={cartRow}>
                        <div style={{ minWidth: 0 }}>
                          <div style={cartName}>{p?.name ?? `Prodotto #${it.productId}`}</div>
                          <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "nowrap", color: "rgba(255,255,255,0.70)" }}>€ {fmtMoney(unit)} cad.</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, justifySelf: "center" }}>
                          <button type="button" style={{ ...btnOutlineSmall, opacity: it.qty <= 1 ? 0.5 : 1 }} onClick={() => decCart(it.productId)} disabled={it.qty <= 1}>
                            −
                          </button>

                          <div style={cartQty}>{it.qty}</div>

                          <button type="button" style={{ ...btnOutlineSmall, opacity: it.qty >= maxStock ? 0.5 : 1 }} onClick={() => incCart(it.productId)} disabled={it.qty >= maxStock}>
                            +
                          </button>
                        </div>

                        <div style={cartLineTotal}>€ {fmtMoney(unit * it.qty)}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <label style={lbl}>Note (opzionale)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} style={noteBox} placeholder="Es: lascia al portiere, citofono rotto..." />

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: "rgba(245,215,122,0.98)" }}>Totale: € {fmtMoney(cartTotal)}</div>
              </div>

              {checkoutMsg && <div style={checkoutBox}>{checkoutMsg}</div>}

              <button type="button" style={{ ...btnGold, marginTop: 10, opacity: cartItems.length === 0 || checkoutLoading ? 0.6 : 1 }} onClick={checkout} disabled={cartItems.length === 0 || checkoutLoading}>
                {checkoutLoading ? "Conferma..." : "Conferma ordine"}
              </button>
            </aside>
          )}
        </div>

        <BottomCategoryNav
          categories={categories}
          selected={category}
          onSelect={(c) => {
            setPage(0);
            setCategory(c);
          }}
        />
      </main>
    </div>
  );
}

/* =========================
   STYLES — Black & Gold Products
   ========================= */

const layout: React.CSSProperties = {
  display: "flex",
  minHeight: "calc(100vh - 52px)",
  background: "transparent",
};

const main: React.CSSProperties = {
  flex: 1,
  padding: 14,
  paddingBottom: 80,
  color: "rgba(255,255,255,0.92)",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const h2: React.CSSProperties = {
  margin: 0,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const h3: React.CSSProperties = {
  margin: 0,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const search: React.CSSProperties = {
  padding: 10,
  borderRadius: 12,
  width: 280,
  maxWidth: "60vw",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.90)",
  outline: "none",
};

const warnBox: React.CSSProperties = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 12,
  background: "rgba(212,175,55,0.12)",
  border: "1px solid rgba(212,175,55,0.35)",
  color: "rgba(255,255,255,0.86)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.35)",
};

const errBox: React.CSSProperties = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 12,
  background: "rgba(176,0,32,0.22)",
  border: "1px solid rgba(255,140,140,0.22)",
  color: "rgba(255,220,220,0.95)",
};

const contentGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 320px",
  gap: 12,
  alignItems: "start",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 320px))",
  gap: 12,
  alignItems: "start",
  justifyContent: "center",
};

const cardWrap: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const card: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(0,0,0,0.55)",
  position: "relative",
  overflow: "hidden",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const promoTop: React.CSSProperties = {
  width: "fit-content",
  maxWidth: "100%",
  margin: "0 auto",
  padding: "5px 10px",
  borderRadius: 999,

  background: "rgba(176, 0, 32, 0.92)",
  color: "#fff",
  border: "1px solid rgba(255, 140, 140, 0.35)",

  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
};


const promoBadge: React.CSSProperties = {
  position: "absolute",
  top: 10,
  right: 10,
  background: "rgba(176,0,32,0.92)",
  color: "white",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 13,
  border: "1px solid rgba(212,175,55,0.25)",
  boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
};

const imgFrame: React.CSSProperties = {
  width: "100%",
  height: 210, 
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.96)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  marginBottom: 10,
  padding: 12,        
  boxSizing: "border-box",
};

const img: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",        
  objectPosition: "center",    
  display: "block",
  transition: "transform .15s ease, opacity .15s ease",
};


const productName: React.CSSProperties = {
  fontWeight: 900,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "rgba(255,255,255,0.92)",
};

const priceBox: React.CSSProperties = { display: "grid", gap: 6 };

const oldPriceBand: React.CSSProperties = {
  background: "rgba(176,0,32,0.18)",
  border: "1px solid rgba(255,140,140,0.20)",
  borderRadius: 12,
  padding: "8px 10px",
  color: "rgba(255,220,220,0.95)",
  fontWeight: 800,
};

const oldPriceText: React.CSSProperties = { textDecoration: "line-through", fontWeight: 900 };

const newPriceBand: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(245,215,122,0.95), rgba(212,175,55,0.95))",
  borderRadius: 12,
  padding: "10px 10px",
  color: "#101216",
  fontWeight: 900,
  display: "flex",
  alignItems: "baseline",
  boxShadow: "0 14px 26px rgba(212,175,55,0.14)",
};

const newPriceText: React.CSSProperties = { fontSize: 20, fontWeight: 950 };

const plainPrice: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 18,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.45)",
};

const availability: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  opacity: 0.85,
  color: "rgba(255,255,255,0.78)",
};

const pickRow: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const pickValue: React.CSSProperties = {
  width: 34,
  textAlign: "center",
  fontWeight: 900,
  color: "rgba(245,215,122,0.98)",
};

const noAddNote: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  opacity: 0.75,
  color: "rgba(255,255,255,0.70)",
};

const cartCard: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.30)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(0,0,0,0.62)",
  position: "sticky",
  top: 70,
  height: "fit-content",
  minWidth: 0,
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
  transition: "transform .15s ease, box-shadow .15s ease",
};

const cartRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  gap: 8,
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(0,0,0,0.35)",
};

const cartName: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.2,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  color: "rgba(255,255,255,0.90)",
};

const cartQty: React.CSSProperties = {
  width: 26,
  textAlign: "center",
  fontWeight: 950,
  color: "rgba(245,215,122,0.98)",
};

const cartLineTotal: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 13,
  whiteSpace: "nowrap",
  justifySelf: "end",
  color: "rgba(245,215,122,0.98)",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  marginTop: 12,
  marginBottom: 6,
  color: "rgba(255,255,255,0.75)",
};

const noteBox: React.CSSProperties = {
  width: "100%",
  minHeight: 70,
  padding: 10,
  borderRadius: 12,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.90)",
  outline: "none",
};

const checkoutBox: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 12,
  background: "rgba(212,175,55,0.12)",
  border: "1px solid rgba(212,175,55,0.35)",
  fontSize: 13,
  color: "rgba(255,255,255,0.86)",
};

const pager: React.CSSProperties = {
  margin: "14px 0",
  display: "flex",
  justifyContent: "center",
  gap: 10,
  alignItems: "center",
};

const btnGold: React.CSSProperties = {
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

const btnOutlineSmall: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.45)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(245,215,122,0.98)",
  fontWeight: 900,
  cursor: "pointer",
};

const promoTopSlot: React.CSSProperties = {
  minHeight: 28,
  marginBottom: -2,
  display: "flex",
  justifyContent: "center",
};
