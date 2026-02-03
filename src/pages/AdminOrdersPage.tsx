import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SideMenu from "../components/SideMenu";
import { isLoggedIn } from "../auth/auth.store";
import {
  deleteAdminOrder,
  searchAdminOrders,
  type AdminOrderSearchParams,
  type OrderDTO,
} from "../admin/adminOrders.service";
import { fmtMoney } from "../utils/money";

type Period = "" | "DAY" | "WEEK" | "MONTH";

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
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
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

/** Date range picker (giornaliero) */
function DateRangePicker(props: { value: Range; onChange: (r: Range) => void }) {
  const { value, onChange } = props;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value.start ? ymdToDate(value.start) : new Date();
    return base ?? new Date();
  });

  // preview range quando ho scelto start e sto cercando end
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
    // Primo click o ripartenza
    if (!value.start || (value.start && value.end)) {
      onChange({ start: ymd, end: "" });
      setHoverDay("");
      return;
    }

    // Se clicco prima dello start, lo sposto
    if (cmpYmd(ymd, value.start) < 0) {
      onChange({ start: ymd, end: "" });
      setHoverDay("");
      return;
    }

    // Secondo click -> set end e chiudo
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
        <span style={{ marginLeft: "auto", opacity: 0.7, color: "rgba(255,255,255,0.75)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={popover}>
          <div style={popHeader}>
            <button
              type="button"
              style={btnOutlineMini}
              onClick={() => setView((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              ◀
            </button>
            <div style={{ fontWeight: 950, textTransform: "capitalize", color: "rgba(245,215,122,0.98)" }}>
              {monthLabel(view)}
            </div>
            <button
              type="button"
              style={btnOutlineMini}
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

              const inAnyRange = Boolean(inFinalRange || inPreviewRange);

              // colori black&gold
              const bg = isStart || isEnd ? "rgba(212,175,55,0.95)" : inAnyRange ? "rgba(212,175,55,0.20)" : "rgba(0,0,0,0.35)";
              const col = isStart || isEnd ? "#101216" : "rgba(255,255,255,0.90)";
              const brd =
                isStart || isEnd
                  ? "rgba(212,175,55,0.95)"
                  : inAnyRange
                  ? "rgba(212,175,55,0.55)"
                  : "rgba(255,255,255,0.10)";

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
                    opacity: c.inMonth ? 1 : 0.35,
                    background: bg,
                    color: col,
                    borderColor: brd,
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
              style={btnOutlineMiniWide}
              onClick={() => {
                onChange({ start: "", end: "" });
                setHoverDay("");
              }}
            >
              Reset periodo
            </button>

            <button type="button" style={btnGoldMiniWide} onClick={() => setOpen(false)}>
              Chiudi
            </button>
          </div>

          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 8 }}>
            Clic 1 = data inizio • Clic 2 = data fine
          </div>
        </div>
      )}
    </div>
  );
}

/* conversione range -> datetime per API (00:00/23:59) */
function toLocalDateTimeStart(ymd: string) {
  return `${ymd}T00:00`;
}
function toLocalDateTimeEnd(ymd: string) {
  return `${ymd}T23:59`;
}

/* =========================
   Page
   ========================= */
export default function AdminOrdersPage() {
  const nav = useNavigate();
  const logged = isLoggedIn();

  // filtri (UI)
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [city, setCity] = useState("");
  const [period, setPeriod] = useState<Period>("");

  // range date (solo giorni)
  const [range, setRange] = useState<Range>({ start: "", end: "" });

  // paginazione
  const [page, setPage] = useState(0);

  // stato dati
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  // filtri “applicati”
  const [applied, setApplied] = useState<AdminOrderSearchParams>({
    page: 0,
    size: 10,
    sort: "dateTime,desc",
    customer: null,
    product: null,
    city: null,
    from: null,
    to: null,
    period: null,
  });

  const hasRange = useMemo(() => Boolean(range.start || range.end), [range]);

  function validateRange(): string | null {
    if (!range.start && !range.end) return null;

    // end senza start -> ok (singolo giorno)
    if (!range.start && range.end) return null;

    if (range.start && range.end && cmpYmd(range.end, range.start) < 0) {
      return "Intervallo date non valido: la fine è prima dell'inizio.";
    }

    return null;
  }

  function applyFilters() {
    const rangeErr = validateRange();
    if (rangeErr) {
      setErr(rangeErr);
      return;
    }

    setErr(null);
    setPage(0);

    // se ho range (anche solo start), ignoro period e costruisco from/to
    let fromDt: string | null = null;
    let toDt: string | null = null;

    if (range.start && range.end) {
      fromDt = toLocalDateTimeStart(range.start);
      toDt = toLocalDateTimeEnd(range.end);
    } else if (range.start && !range.end) {
      fromDt = toLocalDateTimeStart(range.start);
      toDt = toLocalDateTimeEnd(range.start);
    } else if (!range.start && range.end) {
      fromDt = toLocalDateTimeStart(range.end);
      toDt = toLocalDateTimeEnd(range.end);
    }

    setApplied({
      page: 0,
      size: 10,
      sort: "dateTime,desc",
      customer: customer || null,
      product: product || null,
      city: city || null,
      from: fromDt,
      to: toDt,
      period: hasRange ? null : (period || null),
    });
  }

  function resetFilters() {
    setCustomer("");
    setProduct("");
    setCity("");
    setPeriod("");
    setRange({ start: "", end: "" });

    setErr(null);
    setPage(0);

    setApplied({
      page: 0,
      size: 10,
      sort: "dateTime,desc",
      customer: null,
      product: null,
      city: null,
      from: null,
      to: null,
      period: null,
    });
  }

  async function load(currentPage: number, filters: AdminOrderSearchParams) {
    setLoading(true);
    setErr(null);

    try {
      const data = await searchAdminOrders({
        ...filters,
        page: currentPage,
        size: 10,
        sort: "dateTime,desc",
      });

      setOrders(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) setErr("Non autenticato. Fai login.");
      else if (status === 403) setErr("Accesso negato: serve ruolo ADMIN.");
      else setErr(e?.response?.data?.message ?? "Errore caricamento ordini (admin)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!logged) return;
    load(page, applied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged, page, applied]);

  async function onDelete(idOrder: number) {
    if (!confirm(`Eliminare ordine #${idOrder}?`)) return;
    try {
      await deleteAdminOrder(idOrder);
      await load(page, applied);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Errore eliminazione ordine");
    }
  }

  const canPrev = page > 0;
  const canNext = totalPages > 0 && page + 1 < totalPages;

  return (
    <div style={layout}>
      <SideMenu />

      <main style={main}>
        {!logged ? (
          <div style={card}>
            <h2 style={h2}>Admin - Ordini</h2>
            <p style={{ color: "rgba(255,255,255,0.80)" }}>Devi autenticarti.</p>
            <button style={btnGold} onClick={() => nav("/login")} type="button">
              Vai al login
            </button>
          </div>
        ) : (
          <div style={{ width: "min(1150px, 100%)" }}>
            <div style={topBar}>
              <h2 style={{ ...h2, marginTop: 0, marginBottom: 0 }}>Admin - Ordini</h2>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  style={{ ...btnOutline, opacity: !canPrev || loading ? 0.55 : 1 }}
                  disabled={!canPrev || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  type="button"
                >
                  ◀ Prev
                </button>

                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  Pagina <b style={{ color: "rgba(245,215,122,0.98)" }}>{totalPages === 0 ? 0 : page + 1}</b> /{" "}
                  <b style={{ color: "rgba(245,215,122,0.98)" }}>{totalPages}</b>
                </div>

                <button
                  style={{ ...btnOutline, opacity: !canNext || loading ? 0.55 : 1 }}
                  disabled={!canNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  Next ▶
                </button>
              </div>
            </div>

            {/* FILTRI */}
            <div style={filtersCard}>
              <div style={filtersGrid}>
                <div>
                  <div style={lbl}>Cliente (nome/cognome)</div>
                  <input
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    style={inp}
                    placeholder="Es: Mario"
                  />
                </div>

                <div>
                  <div style={lbl}>Prodotto</div>
                  <input value={product} onChange={(e) => setProduct(e.target.value)} style={inp} placeholder="Es: Mouse" />
                </div>

                <div>
                  <div style={lbl}>Città</div>
                  <input value={city} onChange={(e) => setCity(e.target.value)} style={inp} placeholder="Es: Roma" />
                </div>

                <div>
                  <div style={lbl}>Periodo rapido</div>
                  <select
  value={period}
  onChange={(e) => {
    const p = e.target.value as Period;
    setPeriod(p);
    if (p) setRange({ start: "", end: "" }); // periodo rapido scelto => svuoto range
  }}
  style={selectStyle}
>
  <option value="" style={optionStyle}>
    (nessuno)
  </option>
  <option value="DAY" style={optionStyle}>
    Oggi
  </option>
  <option value="WEEK" style={optionStyle}>
    Questa settimana
  </option>
  <option value="MONTH" style={optionStyle}>
    Questo mese
  </option>
</select>


                  <div style={hint}>
                    {hasRange
                      ? "Hai impostato un periodo: il periodo rapido verrà ignorato."
                      : "Usa il periodo rapido se non imposti un periodo."}
                  </div>
                </div>

                <div>
                  <div style={lbl}>Periodo (inizio/fine)</div>
                  <DateRangePicker
                    value={range}
                    onChange={(r) => {
                      setRange(r);
                      if (r.start || r.end) setPeriod("");
                    }}
                  />
                  <div style={hint}>
                    {range.start && !range.end
                      ? `Seleziona la data fine (oppure applica: filtrerà solo ${ymdToDmy(range.start)}).`
                      : hasRange
                      ? "Filtro per periodo attivo (00:00–23:59)."
                      : "Seleziona un periodo (clic 1 inizio, clic 2 fine)."}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button style={btnGold} onClick={applyFilters} disabled={loading} type="button">
                  Applica filtri
                </button>
                <button style={btnOutline} onClick={resetFilters} disabled={loading} type="button">
                  Reset
                </button>
              </div>
            </div>

            {loading && <div style={infoBox}>Caricamento...</div>}
            {err && <div style={warnBox}>{err}</div>}
            {!loading && !err && orders.length === 0 && <div style={infoBox}>Nessun ordine.</div>}

            <div style={{ display: "grid", gap: 12 }}>
              {orders.map((o) => (
                <div key={o.idOrder} style={orderCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>
                        Ordine #{o.idOrder}
                      </div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.72)" }}>{fmt(o.dateTime)}</div>

                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", marginTop: 4 }}>
                        <b style={{ color: "rgba(245,215,122,0.98)" }}>Cliente:</b> {o.firstName} {o.lastName} — {o.city}
                        {o.idUser != null && (
                          <>
                            {" "}
                            <span style={{ opacity: 0.75 }}>(idUser={o.idUser})</span>
                          </>
                        )}
                      </div>

                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                        <b style={{ color: "rgba(245,215,122,0.98)" }}>Spedizione:</b> {o.address} — {o.phone}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={totalBox}>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>Totale</div>
                        <div style={{ fontWeight: 950, fontSize: 16, color: "rgba(245,215,122,0.98)" }}>
                          € {fmtMoney(orderTotal(o))}
                        </div>
                      </div>

                      <button style={btnDanger} onClick={() => onDelete(o.idOrder)} type="button">
                        Elimina
                      </button>
                    </div>
                  </div>

                  {o.description && (
                    <div style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.82)" }}>
                      <b style={{ color: "rgba(245,215,122,0.98)" }}>Note:</b> {o.description}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "rgba(245,215,122,0.98)" }}>
                      Prodotti
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {(o.products ?? []).map((it, idx) => (
                        <div key={`${it.productId}-${idx}`} style={row}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.90)" }}>
                              {it.name ?? `Prodotto #${it.productId}`}
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)" }}>
                              qty: <b style={{ color: "rgba(245,215,122,0.98)" }}>{it.orderedQuantity}</b> • prezzo:{" "}
                              <b style={{ color: "rgba(245,215,122,0.98)" }}>{fmtMoney(it.price ?? 0)} €</b>
                            </div>
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 950, color: "rgba(245,215,122,0.98)" }}>
                            {fmtMoney((it.price ?? 0) * (it.orderedQuantity ?? 0))} €
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* pager bottom */}
            {totalPages > 1 && (
              <div style={pager}>
                <button
                  style={{ ...btnOutline, opacity: !canPrev || loading ? 0.55 : 1 }}
                  disabled={!canPrev || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
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
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* formato gg/mm/aaaa hh:mm */
function fmt(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = d.getFullYear();
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());

  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function orderTotal(o: OrderDTO) {
  return (o.products ?? []).reduce((sum, it) => {
    const unit = Number(it.price ?? 0);
    const qty = Number(it.orderedQuantity ?? 0);
    return sum + unit * qty;
  }, 0);
}

/* =========================
   STYLES — Black & Gold Admin Orders
   ========================= */

const layout: React.CSSProperties = { display: "flex", minHeight: "calc(100vh - 52px)" };

const main: React.CSSProperties = {
  flex: 1,
  padding: 14,
  color: "rgba(255,255,255,0.92)",
};

const topBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const h2: React.CSSProperties = {
  margin: 0,
  color: "rgba(245,215,122,0.98)",
  textShadow: "0 10px 22px rgba(0,0,0,0.55)",
  letterSpacing: 0.2,
};

const card: React.CSSProperties = {
  width: "min(580px, 100%)",
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 16,
  padding: 16,
  background: "rgba(0,0,0,0.55)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
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

const orderCard: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.55)",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const row: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(0,0,0,0.25)",
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

const totalBox: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: "8px 10px",
  background: "rgba(0,0,0,0.30)",
  minWidth: 140,
  textAlign: "right",
};

const pager: React.CSSProperties = {
  margin: "14px 0",
  display: "flex",
  justifyContent: "center",
  gap: 10,
  alignItems: "center",
};

/* Filters */
const filtersCard: React.CSSProperties = {
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(0,0,0,0.55)",
  margin: "12px 0",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const filtersGrid: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const lbl: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginBottom: 6, color: "rgba(255,255,255,0.80)" };

const hint: React.CSSProperties = { fontSize: 12, opacity: 0.75, marginTop: 6, color: "rgba(255,255,255,0.70)" };

const inp: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.90)",
  outline: "none",
};

/* Datepicker (dark) */
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
  width: 330,
  border: "1px solid rgba(212,175,55,0.30)",
  borderRadius: 16,
  background: "rgba(0,0,0,0.85)",
  padding: 12,
  boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
  backdropFilter: "blur(12px)",
};

const popHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const btnOutlineMini: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid rgba(212,175,55,0.55)",
  background: "rgba(0,0,0,0.25)",
  color: "rgba(245,215,122,0.98)",
  cursor: "pointer",
  fontWeight: 900,
};

const btnOutlineMiniWide: React.CSSProperties = {
  ...btnOutlineMini,
  padding: "8px 10px",
};

const btnGoldMiniWide: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "0px",
  background: "linear-gradient(180deg, rgba(245,215,122,0.95), rgba(212,175,55,0.95))",
  color: "#101216",
  cursor: "pointer",
  fontWeight: 950,
};

const dowRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginBottom: 6,
};

const dowCell: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  textAlign: "center",
  fontWeight: 800,
  color: "rgba(255,255,255,0.75)",
};

const calGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
};

const dayBtn: React.CSSProperties = {
  height: 36,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.35)",
  cursor: "pointer",
  fontWeight: 800,
};

const selectStyle: React.CSSProperties = {
  ...inp,                 // mantiene il look black & gold nel form
  appearance: "auto",
};

const optionStyle: React.CSSProperties = {
  backgroundColor: "#ffffff", // dropdown aperto: sfondo bianco
  color: "#111111",           // testo nero
};

