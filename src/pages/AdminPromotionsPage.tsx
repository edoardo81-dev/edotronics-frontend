import { useEffect, useMemo, useRef, useState } from "react";
import SideMenu from "../components/SideMenu";
import {
  archiveAdminPromotion,
  createAdminPromotion,
  getAdminPromotions,
  updateAdminPromotion,
  type PromotionCreateRequestDTO,
  type PromotionResponseDTO,
} from "../admin/adminPromotions.service";
import { getProducts } from "../services/product.service";
import type { Page, ProductDTO } from "../types/dto";
import { fmtMoney } from "../utils/money";

type ItemRow = { productId: string; discountPercent: string };

type Range = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymdToDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function ymdToDmy(ymd: string) {
  const dt = ymdToDate(ymd);
  if (!dt) return ymd;
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

function cmpYmd(a: string, b: string) {
  return a.localeCompare(b);
}

function isBetween(day: string, start: string, end: string) {
  if (!start || !end) return false;
  return cmpYmd(day, start) >= 0 && cmpYmd(day, end) <= 0;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function buildMonthGrid(view: Date) {
  const year = view.getFullYear();
  const month = view.getMonth();

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const firstDayWeek = (first.getDay() + 6) % 7; // Mon=0..Sun=6
  const daysInMonth = last.getDate();

  const cells: Array<{ ymd: string; inMonth: boolean }> = [];

  for (let i = 0; i < firstDayWeek; i++) {
    const d = new Date(year, month, 1 - (firstDayWeek - i));
    cells.push({ ymd: toYmd(d), inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({ ymd: toYmd(d), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const d = new Date(year, month, daysInMonth + (cells.length - (firstDayWeek + daysInMonth)) + 1);
    cells.push({ ymd: toYmd(d), inMonth: false });
  }

  const weeks: Array<Array<{ ymd: string; inMonth: boolean }>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function DateRangePicker(props: { value: Range; onChange: (r: Range) => void }) {
  const { value, onChange } = props;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value.start ? ymdToDate(value.start) : new Date();
    return base ?? new Date();
  });

  const [hoverDay, setHoverDay] = useState<string>("");

  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (boxRef.current && !boxRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label = useMemo(() => {
    if (!value.start && !value.end) return "Seleziona periodo";
    if (value.start && !value.end) return `Dal ${ymdToDmy(value.start)} …`;
    return `Dal ${ymdToDmy(value.start)} al ${ymdToDmy(value.end)}`;
  }, [value]);

  const weeks = useMemo(() => buildMonthGrid(view), [view]);

  function clickDay(ymd: string) {
    if (!value.start || (value.start && value.end)) {
      onChange({ start: ymd, end: "" });
      setHoverDay("");
      return;
    }

    if (cmpYmd(ymd, value.start) < 0) {
      onChange({ start: ymd, end: "" });
      setHoverDay("");
      return;
    }

    onChange({ start: value.start, end: ymd });
    setHoverDay("");
    setOpen(false);
  }

  const dow = ["L", "M", "M", "G", "V", "S", "D"];

  const previewEnd = value.start && !value.end && hoverDay && cmpYmd(hoverDay, value.start) >= 0 ? hoverDay : "";

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button type="button" style={rangeBtn} onClick={() => setOpen((v) => !v)}>
        <span style={{ fontWeight: 900, color: "rgba(245,215,122,0.98)" }}>Periodo:</span>{" "}
        <span style={{ color: "rgba(255,255,255,0.88)" }}>{label}</span>
        <span style={{ marginLeft: "auto", opacity: 0.7, color: "rgba(255,255,255,0.78)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={popover}>
          <div style={popHeader}>
            <button
              type="button"
              style={btnMini}
              onClick={() => setView((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              ◀
            </button>

            <div style={{ fontWeight: 950, textTransform: "capitalize", color: "rgba(245,215,122,0.98)" }}>
              {monthLabel(view)}
            </div>

            <button
              type="button"
              style={btnMini}
              onClick={() => setView((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            >
              ▶
            </button>
          </div>

          <div style={dowRow}>
            {dow.map((x) => (
              <div key={x} style={dowCell}>
                {x}
              </div>
            ))}
          </div>

          <div style={calGrid}>
            {weeks.flat().map((c) => {
              const isStart = value.start && c.ymd === value.start;
              const isEnd = value.end && c.ymd === value.end;

              const inFinalRange = value.start && value.end && isBetween(c.ymd, value.start, value.end);
              const inPreviewRange = value.start && !value.end && previewEnd && isBetween(c.ymd, value.start, previewEnd);

              const inAnyRange = inFinalRange || inPreviewRange;

              const bg =
                isStart || isEnd
                  ? "rgba(245,215,122,0.98)"
                  : inAnyRange
                  ? "rgba(212,175,55,0.18)"
                  : "rgba(0,0,0,0.25)";
              const border =
                isStart || isEnd
                  ? "rgba(245,215,122,0.95)"
                  : inAnyRange
                  ? "rgba(212,175,55,0.35)"
                  : "rgba(255,255,255,0.10)";
              const color = isStart || isEnd ? "#101216" : "rgba(255,255,255,0.88)";

              return (
                <button
                  key={c.ymd}
                  type="button"
                  onClick={() => clickDay(c.ymd)}
                  onMouseEnter={() => {
                    if (value.start && !value.end) setHoverDay(c.ymd);
                  }}
                  onMouseLeave={() => {
                    if (value.start && !value.end) setHoverDay("");
                  }}
                  style={{
                    ...dayBtn,
                    opacity: c.inMonth ? 1 : 0.32,
                    background: bg,
                    color,
                    borderColor: border,
                    boxShadow: isStart || isEnd ? "0 12px 22px rgba(212,175,55,0.18)" : "none",
                  }}
                  title={ymdToDmy(c.ymd)}
                >
                  {Number(c.ymd.slice(-2))}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "space-between" }}>
            <button
              type="button"
              style={btnOutline}
              onClick={() => {
                onChange({ start: "", end: "" });
                setHoverDay("");
              }}
            >
              Reset periodo
            </button>

            <button type="button" style={btnGold} onClick={() => setOpen(false)}>
              Chiudi
            </button>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8, color: "rgba(255,255,255,0.72)" }}>
            Clic 1 = data inizio • Clic 2 = data fine
          </div>
        </div>
      )}
    </div>
  );
}

function fmtItDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPromotionsPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [promos, setPromos] = useState<PromotionResponseDTO[]>([]);

  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  const [range, setRange] = useState<Range>({ start: "", end: "" });

  const [items, setItems] = useState<ItemRow[]>([]);

  const [prodQ, setProdQ] = useState("");
  const [prodPage, setProdPage] = useState(0);
  const [prodData, setProdData] = useState<Page<ProductDTO> | null>(null);
  const [prodLoading, setProdLoading] = useState(false);

  const [productCache, setProductCache] = useState<Record<number, ProductDTO>>({});

  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<PromotionResponseDTO | null>(null);

  const [archPage, setArchPage] = useState(0);
  const archPageSize = 3; // ✅ MAX 3 archiviate per pagina

  async function load(includeArchived = showArchived) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getAdminPromotions(includeArchived);
      setPromos(data ?? []);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Errore caricamento promozioni");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(showArchived);
  }, [showArchived]);

  useEffect(() => {
    setProdLoading(true);
    getProducts({ q: prodQ, category: null, page: prodPage, size: 12, sort: "name,asc" })
      .then((res) => {
        setProdData(res);

        const entries: Record<number, ProductDTO> = {};
        (res?.content ?? []).forEach((p) => {
          entries[p.productId] = p;
        });
        setProductCache((prev) => ({ ...prev, ...entries }));
      })
      .catch(() => setProdData(null))
      .finally(() => setProdLoading(false));
  }, [prodQ, prodPage]);

  function isSelected(productId: number) {
    return items.some((x) => Number(x.productId) === productId);
  }

  function toggleProduct(p: ProductDTO) {
    setErr(null);

    setProductCache((prev) => ({ ...prev, [p.productId]: p }));

    setItems((prev) => {
      const pid = String(p.productId);
      const idx = prev.findIndex((r) => r.productId === pid);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { productId: pid, discountPercent: "10" }];
    });
  }

  function updateItemRow(productId: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r)));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((r) => r.productId !== productId));
  }

  function toLocalDateTimeStart(ymd: string) {
    return `${ymd}T00:00`;
  }
  function toLocalDateTimeEnd(ymd: string) {
    return `${ymd}T23:59`;
  }

  async function onCreate() {
    setErr(null);

    if (!name.trim()) {
      setErr("Nome promozione obbligatorio");
      return;
    }
    if (!range.start || !range.end) {
      setErr("Seleziona un periodo completo (inizio e fine).");
      return;
    }
    if (cmpYmd(range.end, range.start) < 0) {
      setErr("Periodo non valido: fine prima dell'inizio.");
      return;
    }

    const parsedItems = items
      .map((r) => ({
        productId: Number(r.productId),
        discountPercent: Number(r.discountPercent),
      }))
      .filter(
        (x) =>
          !Number.isNaN(x.productId) &&
          x.productId > 0 &&
          !Number.isNaN(x.discountPercent) &&
          x.discountPercent > 0 &&
          x.discountPercent <= 90
      );

    if (parsedItems.length === 0) {
      setErr("Seleziona almeno un prodotto e imposta uno sconto valido (1-90%).");
      return;
    }

    const payload: PromotionCreateRequestDTO = {
      name: name.trim(),
      startsAt: toLocalDateTimeStart(range.start),
      endsAt: toLocalDateTimeEnd(range.end),
      active,
      items: parsedItems,
    };

    setLoading(true);
    try {
      await createAdminPromotion(payload);
      setName("");
      setActive(true);
      setRange({ start: "", end: "" });
      setItems([]);
      setProdQ("");
      setProdPage(0);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Errore creazione promozione");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActivePromo(p: PromotionResponseDTO) {
    setErr(null);
    setLoading(true);
    try {
      await updateAdminPromotion(p.id, { active: !p.active });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Errore aggiornamento promozione");
    } finally {
      setLoading(false);
    }
  }

  async function onArchivePromo(p: PromotionResponseDTO) {
    setErr(null);
    setArchiveTarget(p);
  }

  async function confirmArchive() {
    if (!archiveTarget) return;

    setErr(null);
    setLoading(true);

    try {
      await archiveAdminPromotion(archiveTarget.id);
      setArchiveTarget(null);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Errore archiviazione promozione");
    } finally {
      setLoading(false);
    }
  }

  const selectedCount = items.length;

  const prodById = useMemo(() => {
    const m = new Map<number, ProductDTO>();
    Object.values(productCache).forEach((p) => m.set(p.productId, p));
    return m;
  }, [productCache]);

  const activePromos = useMemo(() => promos.filter((p) => !p.archived), [promos]);

  const archivedPromos = useMemo(() => promos.filter((p) => Boolean(p.archived)), [promos]);

  // ✅ (consigliato) archiviate: più recenti prima
  const archivedPromosSorted = useMemo(() => {
    const copy = [...archivedPromos];
    copy.sort((a, b) => {
      const ae = a.endsAt ?? "";
      const be = b.endsAt ?? "";
      const byEnd = be.localeCompare(ae);
      if (byEnd !== 0) return byEnd;
      return (b.id ?? 0) - (a.id ?? 0);
    });
    return copy;
  }, [archivedPromos]);

  const totalArchPages = Math.max(1, Math.ceil(archivedPromosSorted.length / archPageSize));

  const archivedSlice = useMemo(() => {
    const start = archPage * archPageSize;
    return archivedPromosSorted.slice(start, start + archPageSize);
  }, [archivedPromosSorted, archPage, archPageSize]);

  useEffect(() => {
    const maxPage = Math.max(0, totalArchPages - 1);
    if (archPage > maxPage) setArchPage(maxPage);
  }, [totalArchPages, archPage]);

  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        {/* ✅ MODAL conferma archiviazione */}
        {archiveTarget && (
          <div style={modalOverlay} onMouseDown={() => setArchiveTarget(null)}>
            <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 950, fontSize: 16, color: "rgba(245,215,122,0.98)" }}>
                  Conferma archiviazione
                </div>
                <button type="button" style={iconBtn} onClick={() => setArchiveTarget(null)} disabled={loading}>
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.35, color: "rgba(255,255,255,0.86)" }}>
                Stai per archiviare la promozione:
                <div style={{ marginTop: 8, ...archiveBox }}>
                  <div style={{ fontWeight: 950 }}>
                    #{archiveTarget.id} — {archiveTarget.name}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    {fmtItDateTime(archiveTarget.startsAt)} → {fmtItDateTime(archiveTarget.endsAt)}
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                  Verrà disattivata e non comparirà più nella lista standard.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" }}>
                <button type="button" style={btnOutline} onClick={() => setArchiveTarget(null)} disabled={loading}>
                  Annulla
                </button>

                <button type="button" style={btnDangerFilled} onClick={confirmArchive} disabled={loading}>
                  {loading ? "Archivia..." : "Archivia"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={pageTop}>
          <h2 style={h2}>Admin - Promozioni</h2>

          <label style={toggleArchived}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => {
                setArchPage(0);
                setShowArchived(e.target.checked);
              }}
              style={{ transform: "scale(1.4)" }}
            />
            Mostra archiviate
          </label>
        </div>

        {err && <div style={warnBox}>{err}</div>}
        {loading && <div style={infoBox}>Caricamento...</div>}

        <div style={card}>
          <div style={{ fontWeight: 950, marginBottom: 10, color: "rgba(245,215,122,0.98)" }}>
            Crea nuova promozione
          </div>

          <div style={topGrid}>
            <div style={{ minWidth: 0 }}>
              <div style={lbl}>Nome</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ ...inp, maxWidth: 420 }}
                placeholder="Es: Promo Weekend"
              />
            </div>

            <div style={activeBox}>
              <div style={lbl}>Active</div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.88)" }}>
                  {active ? "Attiva" : "Non attiva"}
                </span>
              </label>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={lbl}>Periodo promozione</div>
              <DateRangePicker value={range} onChange={setRange} />
            </div>
          </div>

          <div style={{ marginTop: 14, fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>
            Seleziona prodotti ({selectedCount})
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={prodQ}
              onChange={(e) => {
                setProdPage(0);
                setProdQ(e.target.value);
              }}
              style={{ ...inp, width: 320, maxWidth: "100%" }}
              placeholder="Cerca prodotto (nome)..."
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                style={btnOutline}
                disabled={prodPage <= 0 || prodLoading}
                onClick={() => setProdPage((p) => Math.max(0, p - 1))}
              >
                ◀
              </button>
              <div style={{ fontSize: 13, opacity: 0.8, color: "rgba(255,255,255,0.75)" }}>
                Pagina <b style={{ color: "rgba(245,215,122,0.98)" }}>{(prodData?.number ?? 0) + 1}</b> /{" "}
                <b style={{ color: "rgba(245,215,122,0.98)" }}>{prodData?.totalPages ?? 1}</b>
              </div>
              <button
                type="button"
                style={btnOutline}
                disabled={Boolean(prodData?.last) || prodLoading}
                onClick={() => setProdPage((p) => p + 1)}
              >
                ▶
              </button>
            </div>
          </div>

          {prodLoading && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Caricamento prodotti...</div>}

          <div style={productGrid}>
            {(prodData?.content ?? []).map((p) => {
              const selected = isSelected(p.productId);

              return (
                <button
                  key={p.productId}
                  type="button"
                  onClick={() => toggleProduct(p)}
                  style={{
                    ...prodCard,
                    borderColor: selected ? "rgba(245,215,122,0.75)" : "rgba(255,255,255,0.10)",
                    outline: selected ? "2px solid rgba(245,215,122,0.85)" : "none",
                    boxShadow: selected ? "0 18px 42px rgba(212,175,55,0.14)" : "none",
                  }}
                  title="Clicca per (de)selezionare"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 950, textAlign: "left", color: "rgba(255,255,255,0.92)" }}>
                      {p.name}
                    </div>
                    <div style={selected ? badgeOn : badgeOff}>{selected ? "✓" : "+"}</div>
                  </div>

                  <div style={{ marginTop: 6, textAlign: "left", fontSize: 13, opacity: 0.85, color: "rgba(255,255,255,0.78)" }}>
                    € {fmtMoney(p.discountedPrice ?? p.price)} • stock:{" "}
                    <b style={{ color: "rgba(245,215,122,0.98)" }}>{p.quantity}</b>
                  </div>

                  {p.promoActive && (
                    <div style={{ marginTop: 6, textAlign: "left", fontSize: 12, opacity: 0.85, color: "rgba(255,255,255,0.70)" }}>
                      (Già in promo: {p.promoName})
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>
            Prodotti in promo
          </div>

          {items.length === 0 ? (
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.75, color: "rgba(255,255,255,0.70)" }}>
              Nessun prodotto selezionato. Clicca sulle cards sopra.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {items.map((r) => {
                const pidNum = Number(r.productId);
                const p = prodById.get(pidNum);

                return (
                  <div key={r.productId} style={rowGrid}>
                    <div style={{ minWidth: 0 }}>
                      <div style={lbl}>Prodotto</div>
                      <div style={pill}>
                        {p?.name ?? `Prodotto #${r.productId}`}{" "}
                        <span style={{ opacity: 0.7 }}> (#{r.productId})</span>
                      </div>
                    </div>

                    <div style={{ width: "50%" }}>
                      <div style={lbl}>Sconto %</div>
                      <input
                        value={r.discountPercent}
                        onChange={(e) => updateItemRow(r.productId, { discountPercent: e.target.value })}
                        style={inp}
                        placeholder="Es: 15"
                      />
                      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, color: "rgba(255,255,255,0.70)" }}>
                        (1–90)
                      </div>
                    </div>

                    <button type="button" style={btnOutline} onClick={() => removeItem(r.productId)}>
                      Rimuovi
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" style={btnGoldWide} onClick={onCreate} disabled={loading}>
              Crea promozione
            </button>
          </div>
        </div>

        {/* LIST */}
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {/* ✅ PROMO ATTIVE */}
          {activePromos.map((p) => {
            const archived = Boolean(p.archived);

            return (
              <div key={p.id} style={{ ...card, opacity: archived ? 0.75 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.92)" }}>
                      #{p.id} — <span style={{ color: "rgba(245,215,122,0.98)" }}>{p.name}</span>
                      {archived && <span style={archivedBadge}>ARCHIVIATA</span>}
                    </div>

                    <div style={{ fontSize: 13, opacity: 0.78, color: "rgba(255,255,255,0.75)" }}>
                      {fmtItDateTime(p.startsAt)} → {fmtItDateTime(p.endsAt)}
                    </div>

                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.80)" }}>
                      Stato:{" "}
                      <b style={{ color: p.active ? "rgba(142,255,199,0.95)" : "rgba(255,140,140,0.95)" }}>
                        {p.active ? "ATTIVA" : "NON ATTIVA"}
                      </b>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" style={btnOutline} onClick={() => toggleActivePromo(p)} disabled={loading || archived}>
                      {p.active ? "Disattiva" : "Attiva"}
                    </button>

                    <button type="button" style={btnDanger} onClick={() => onArchivePromo(p)} disabled={loading || archived}>
                      Archivia
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontWeight: 950, fontSize: 13, color: "rgba(245,215,122,0.98)" }}>
                  Items
                </div>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {(p.items ?? []).map((it) => (
                    <div key={`${p.id}-${it.productId}`} style={miniRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={miniRowName}>
                          {it.productName} (#{it.productId})
                        </div>
                      </div>
                      <div style={{ fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>-{it.discountPercent}%</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* ✅ SEZIONE ARCHIVIATE + PAGINAZIONE (max 3 per pagina) */}
          {showArchived && (
            <>
              <div style={sectionTitle}>Promozioni archiviate</div>

              {archivedPromosSorted.length === 0 ? (
                <div style={infoBox}>Nessuna promozione archiviata.</div>
              ) : (
                <>
                  
                  {archivedSlice.map((p) => (
                    <div key={p.id} style={{ ...card, opacity: 0.72 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 950, color: "rgba(255,255,255,0.90)" }}>
                            #{p.id} — <span style={{ color: "rgba(245,215,122,0.98)" }}>{p.name}</span>
                            <span style={archivedBadge}>ARCHIVIATA</span>
                          </div>
                          <div style={{ fontSize: 13, opacity: 0.78, color: "rgba(255,255,255,0.75)" }}>
                            {fmtItDateTime(p.startsAt)} → {fmtItDateTime(p.endsAt)}
                          </div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.80)" }}>
                            Stato:{" "}
                            <b style={{ color: p.active ? "rgba(142,255,199,0.95)" : "rgba(255,140,140,0.95)" }}>
                              {p.active ? "ATTIVA" : "NON ATTIVA"}
                            </b>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <button type="button" style={{ ...btnOutline, opacity: 0.55 }} disabled>
                            {p.active ? "Disattiva" : "Attiva"}
                          </button>
                          <button type="button" style={{ ...btnDanger, opacity: 0.55 }} disabled>
                            Archivia
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 10, fontWeight: 950, fontSize: 13, color: "rgba(245,215,122,0.98)" }}>
                        Items
                      </div>
                      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                        {(p.items ?? []).map((it) => (
                          <div key={`${p.id}-${it.productId}`} style={miniRow}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={miniRowName}>
                                {it.productName} (#{it.productId})
                              </div>
                            </div>
                            <div style={{ fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>-{it.discountPercent}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {archivedPromosSorted.length > archPageSize && (
                    <div style={pager}>
                      <button
                        type="button"
                        style={btnOutline}
                        disabled={archPage <= 0 || loading}
                        onClick={() => setArchPage((p) => Math.max(0, p - 1))}
                      >
                        ◀ Prev
                      </button>

                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                        Pagina <b style={{ color: "rgba(245,215,122,0.98)" }}>{archPage + 1}</b> /{" "}
                        <b style={{ color: "rgba(245,215,122,0.98)" }}>{totalArchPages}</b>
                      </div>

                      <button
                        type="button"
                        style={btnOutline}
                        disabled={archPage + 1 >= totalArchPages || loading}
                        onClick={() => setArchPage((p) => p + 1)}
                      >
                        Next ▶
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!loading && activePromos.length === 0 && !showArchived && <div style={infoBox}>Nessuna promozione.</div>}
        </div>
      </main>
    </div>
  );
}

/* =========================
   STYLES — Black & Gold Promotions
   ========================= */

const layout: React.CSSProperties = { display: "flex", minHeight: "calc(100vh - 52px)" };

const main: React.CSSProperties = {
  flex: 1,
  padding: 14,
  color: "rgba(255,255,255,0.92)",
};

const pageTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 12,
};

const h2: React.CSSProperties = {
  margin: 0,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const toggleArchived: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  fontSize: 13,
  fontWeight: 950,
  color: "rgba(255,255,255,0.85)",
};

const card: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.30)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.62)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const infoBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.25)",
  background: "rgba(0,0,0,0.55)",
  color: "rgba(255,255,255,0.82)",
  boxShadow: "0 16px 34px rgba(0,0,0,0.35)",
};

const warnBox: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,140,140,0.22)",
  background: "rgba(176,0,32,0.22)",
  color: "rgba(255,220,220,0.95)",
  marginBottom: 12,
};

const topGrid: React.CSSProperties = {
  display: "grid",
  gap: 12,
  alignItems: "end",
  gridTemplateColumns: "minmax(260px, 1fr) 220px minmax(260px, 1fr)",
};

const activeBox: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 10,
  display: "grid",
  gap: 6,
  alignContent: "center",
  justifyContent: "center",
  minHeight: 74,
  background: "rgba(0,0,0,0.35)",
};

const miniRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(0,0,0,0.35)",
};

const miniRowName: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 13,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "rgba(255,255,255,0.90)",
};

const lbl: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginBottom: 6, color: "rgba(255,255,255,0.75)" };

const inp: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.90)",
  outline: "none",
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

const btnGoldWide: React.CSSProperties = {
  ...btnGold,
  width: "min(320px, 100%)",
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

const pill: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.35)",
  fontSize: 13,
  color: "rgba(255,255,255,0.90)",
};

const productGrid: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

const prodCard: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 12,
  background: "rgba(0,0,0,0.45)",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 18px 44px rgba(0,0,0,0.35)",
};

const badgeOn: React.CSSProperties = {
  minWidth: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  border: "1px solid rgba(212,175,55,0.55)",
  background: "linear-gradient(180deg, rgba(245,215,122,0.95), rgba(212,175,55,0.95))",
  color: "#101216",
  fontWeight: 950,
};

const badgeOff: React.CSSProperties = {
  minWidth: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  border: "1px solid rgba(212,175,55,0.55)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(245,215,122,0.98)",
  fontWeight: 950,
};

const rowGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 1fr) 140px auto",
  gap: 12,
  alignItems: "end",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 14,
  padding: 10,
  background: "rgba(0,0,0,0.35)",
};

const archivedBadge: React.CSSProperties = {
  marginLeft: 8,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  padding: "2px 8px",
  borderRadius: 999,
  opacity: 0.9,
  color: "rgba(255,255,255,0.80)",
  background: "rgba(0,0,0,0.25)",
};

const sectionTitle: React.CSSProperties = {
  marginTop: 6,
  fontWeight: 950,
  fontSize: 14,
  color: "rgba(245,215,122,0.98)",
};

const pager: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  justifyContent: "center",
  gap: 10,
  alignItems: "center",
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.70)",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
  padding: 12,
};

const modalCard: React.CSSProperties = {
  width: "min(560px, 100%)",
  borderRadius: 16,
  border: "1px solid rgba(212,175,55,0.30)",
  background: "rgba(0,0,0,0.78)",
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

const archiveBox: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.35)",
  background: "rgba(212,175,55,0.12)",
  padding: "10px 12px",
  borderRadius: 14,
};

/* ===== DateRangePicker styles (theme) ===== */
const rangeBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  cursor: "pointer",
  display: "flex",
  gap: 10,
  alignItems: "center",
  color: "rgba(255,255,255,0.90)",
};

const popover: React.CSSProperties = {
  position: "absolute",
  zIndex: 20,
  top: "calc(100% + 8px)",
  right: 0,
  width: 340,
  border: "1px solid rgba(212,175,55,0.30)",
  borderRadius: 16,
  background: "rgba(0,0,0,0.78)",
  padding: 12,
  boxShadow: "0 18px 44px rgba(0,0,0,0.55)",
  backdropFilter: "blur(12px)",
};

const popHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const btnMini: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 12,
  border: "1px solid rgba(212,175,55,0.55)",
  background: "rgba(0,0,0,0.25)",
  cursor: "pointer",
  color: "rgba(245,215,122,0.98)",
  fontWeight: 900,
};

const dowRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginBottom: 6,
};

const dowCell: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  textAlign: "center",
  fontWeight: 900,
  color: "rgba(255,255,255,0.70)",
};

const calGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const dayBtn: React.CSSProperties = {
  height: 36,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.25)",
  cursor: "pointer",
  fontWeight: 900,
};
