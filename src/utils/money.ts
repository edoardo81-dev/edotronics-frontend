// src/utils/money.ts
export function fmtMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);

  if (!Number.isFinite(n)) return "0,00";

  // ✅ forza separatore migliaia SEMPRE
  // (su alcuni ambienti altrimenti i 4-digit non vengono raggruppati)
  const formatter = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    // TS potrebbe non riconoscere "always": lo forziamo così
    useGrouping: "always" as any,
  });

  return formatter.format(n);
}

// se vuoi direttamente il simbolo euro davanti
export function fmtEuro(value: number | null | undefined): string {
  return `€ ${fmtMoney(value)}`;
}
