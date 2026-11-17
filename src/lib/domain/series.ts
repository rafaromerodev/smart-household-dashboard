import { type ISODate, type Range, addDays, addMonths, daysBetween, endOfMonth, fromISO } from "./dates";

/**
 * Series para el gráfico de gasto acumulado: divide un rango en tramos
 * (días si dura ≤ 62 días, meses si es más largo) y acumula importes.
 */
export interface Bucket { start: ISODate; end: ISODate }

export function buckets(r: Range): Bucket[] {
  const out: Bucket[] = [];
  if (daysBetween(r.from, r.to) <= 62) {
    for (let d = r.from; d <= r.to; d = addDays(d, 1)) out.push({ start: d, end: d });
  } else {
    for (let m = r.from.slice(0, 8) + "01"; m <= r.to; m = addMonths(m, 1)) {
      out.push({ start: m < r.from ? r.from : m, end: endOfMonth(m) > r.to ? r.to : endOfMonth(m) });
    }
  }
  return out;
}

/** Acumulado por tramo; null en los tramos que empiezan después de `today` (aún no han ocurrido). */
export function cumulative(items: { spent_on: ISODate; amount_cents: number }[], bs: Bucket[], today?: ISODate): (number | null)[] {
  const sorted = [...items].sort((a, b) => a.spent_on.localeCompare(b.spent_on));
  let acc = 0;
  let j = 0;
  return bs.map((b) => {
    while (j < sorted.length && sorted[j].spent_on <= b.end) {
      if (sorted[j].spent_on >= bs[0].start) acc += sorted[j].amount_cents;
      j++;
    }
    return today && b.start > today ? null : acc;
  });
}

/** Periodo anterior equivalente (para comparar): semana, mes o año anterior; rango: mismo largo justo antes. */
export function previousRange(kind: "week" | "month" | "year" | "custom", r: Range): Range {
  if (kind === "week") return { from: addDays(r.from, -7), to: addDays(r.to, -7) };
  if (kind === "month") { const f = addMonths(r.from, -1); return { from: f, to: endOfMonth(f) }; }
  if (kind === "year") return { from: addMonths(r.from, -12), to: addMonths(r.to, -12) };
  const len = daysBetween(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

const dFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const mFmt = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
export function bucketLabel(b: Bucket): string {
  return b.start === b.end ? dFmt.format(fromISO(b.start)) : mFmt.format(fromISO(b.start));
}
