import { type ISODate, type Range, addDays, addMonths, isoWeekday } from "./dates";

export type Recurrence = "none" | "daily" | "weekly" | "monthly";

/** Siguiente fecha límite de una tarea recurrente tras completarla. */
export function nextDueDate(due: ISODate | null, rec: Recurrence, completedOn: ISODate): ISODate | null {
  if (rec === "none") return null;
  let base = due ?? completedOn;
  const step = (d: ISODate) => (rec === "daily" ? addDays(d, 1) : rec === "weekly" ? addDays(d, 7) : addMonths(d, 1));
  let next = step(base);
  // Si se completa con retraso, saltar hasta una fecha posterior al día de hoy.
  let guard = 0;
  while (next <= completedOn && guard++ < 1000) {
    base = next;
    next = step(base);
  }
  return next;
}

export interface Series {
  id: string;
  weekday: number; // 1..7
  starts_on: ISODate;
  ends_on: ISODate | null;
}

/** Fechas en las que cae una serie semanal dentro de un rango. */
export function seriesDates(s: Series, r: Range): ISODate[] {
  const from = s.starts_on > r.from ? s.starts_on : r.from;
  const to = s.ends_on && s.ends_on < r.to ? s.ends_on : r.to;
  if (from > to) return [];
  let d = addDays(from, (s.weekday - isoWeekday(from) + 7) % 7);
  const out: ISODate[] = [];
  while (d <= to) {
    out.push(d);
    d = addDays(d, 7);
  }
  return out;
}

/**
 * Combina sesiones guardadas con las ocurrencias "virtuales" de las series:
 * una ocurrencia solo se materializa en BD cuando se marca como realizada,
 * cancelada o se edita. Así no hay que generar filas por adelantado.
 */
export function mergeSessions<S extends Series, W extends { series_id: string | null; session_date: ISODate }>(
  series: S[],
  stored: W[],
  r: Range,
): { stored: W[]; virtual: { series: S; date: ISODate }[] } {
  const taken = new Set(stored.filter((w) => w.series_id).map((w) => `${w.series_id}|${w.session_date}`));
  const virtual: { series: S; date: ISODate }[] = [];
  for (const s of series) {
    for (const d of seriesDates(s, r)) if (!taken.has(`${s.id}|${d}`)) virtual.push({ series: s, date: d });
  }
  return { stored, virtual };
}
