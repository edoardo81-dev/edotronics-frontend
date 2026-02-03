import type { ProductCategory } from "../types/dto";

const label: Record<ProductCategory, string> = {
  SMARTPHONES: "Smartphones",
  PC_TABLETS: "PC & Tablets",
  MONITOR: "Monitor",
  SCANNER_STAMPANTI: "Scanner/Stampanti",
  ACCESSORI: "Accessori",
  USATO_RICONDIZIONATO: "Usato",
};

const BG = "#0b0b0b";
const PANEL = "#121212";
const BORDER = "rgba(212,175,55,0.25)";
const BORDER_STRONG = "rgba(212,175,55,0.55)";
const GOLD = "#D4AF37";


export default function BottomCategoryNav(props: {
  categories: ProductCategory[];
  selected: ProductCategory | null;
  onSelect: (c: ProductCategory | null) => void;
}) {
  const { categories, selected, onSelect } = props;

  return (
    <div style={bar}>
      <button
        style={pill(selected === null)}
        onClick={() => onSelect(null)}
        type="button"
        title="Tutti"
      >
        Tutti
      </button>

      {categories.map((c) => (
        <button
          key={c}
          style={pill(selected === c)}
          onClick={() => onSelect(c)}
          type="button"
          title={label[c] ?? c}
        >
          {label[c] ?? c}
        </button>
      ))}
    </div>
  );
}

function pill(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? BORDER_STRONG : BORDER}`,
    borderRadius: 999,
    padding: "8px 12px",
    background: active ? GOLD : "rgba(255,255,255,0.02)",
    color: active ? BG : GOLD,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 900,
    fontSize: 13,
    outline: "none",
    transition: "transform .12s ease, background .12s ease, border-color .12s ease",
    boxShadow: active ? "0 0 0 2px rgba(212,175,55,0.18) inset" : "none",
  };
}

const bar: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 50,

  background: PANEL,
  borderTop: `1px solid ${BORDER}`,
  boxShadow: "0 -18px 60px rgba(0,0,0,0.55)",

  padding: "10px 12px",
  paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",

  display: "flex",
  gap: 8,

  // ✅ bottoni centrati
  justifyContent: "center",

  // ✅ scroll orizzontale se tanti
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",

  // ✅ evita selezione testo su swipe
  userSelect: "none",
};
