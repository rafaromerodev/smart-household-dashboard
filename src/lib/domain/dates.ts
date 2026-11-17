// Fechas de calendario como cadenas ISO "YYYY-MM-DD" (sin zona horaria),
// calculadas en UTC para que el resultado no dependa del huso del dispositivo.

export type ISODate = string;

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Fecha de hoy en Europe/Madrid. */
export function todayISO(timeZone = "Europe/Madrid", now = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export function addMonths(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toISO(d);
}

/** Día ISO de la semana: 1 = lunes … 7 = domingo. */
export function isoWeekday(s: ISODate): number {
  const wd = fromISO(s).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, 1 - isoWeekday(s));
}

export function startOfMonth(s: ISODate): ISODate {
  return s.slice(0, 8) + "01";
}

export function endOfMonth(s: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(s), 1), -1);
}

export function monthKey(s: ISODate): string {
  return s.slice(0, 7);
}

export type PeriodKind = "week" | "month" | "year" | "custom";
export interface Range { from: ISODate; to: ISODate } // ambos inclusive

export function periodRange(kind: PeriodKind, ref: ISODate, custom?: Range): Range {
  switch (kind) {
    case "week": {
      const from = startOfWeek(ref);
      return { from, to: addDays(from, 6) };
    }
    case "month":
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case "year":
      return { from: ref.slice(0, 4) + "-01-01", to: ref.slice(0, 4) + "-12-31" };
    case "custom":
      if (!custom || custom.from > custom.to) throw new Error("Rango personalizado no válido");
      return custom;
  }
}

export function inRange(s: ISODate, r: Range): boolean {
  return s >= r.from && s <= r.to;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

const dayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });

// Solo la primera letra en mayúscula ("Lunes, 9 de noviembre"), como se escribe en español.
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const formatDay = (s: ISODate) => cap(dayFmt.format(fromISO(s)));
export const formatLongDay = (s: ISODate) => cap(longFmt.format(fromISO(s)));
export const formatMonth = (s: ISODate) => cap(monthFmt.format(fromISO(s.length === 7 ? s + "-01" : s)));
