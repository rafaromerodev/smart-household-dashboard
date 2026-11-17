import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonth } from "@/lib/domain/dates";

/** Navegación entre meses mediante ?mes=YYYY-MM conservando el resto de parámetros. */
export function MonthNav({ month, basePath, params = {} }: { month: string; basePath: string; params?: Record<string, string | undefined> }) {
  const href = (m: string) => {
    const q = new URLSearchParams(Object.entries({ ...params, mes: m }).filter(([, v]) => v) as [string, string][]);
    return `${basePath}?${q}`;
  };
  const prev = addMonths(month + "-01", -1).slice(0, 7);
  const next = addMonths(month + "-01", 1).slice(0, 7);
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-2 p-1">
      <Link href={href(prev)} className="rounded-xl p-2 text-muted hover:bg-surface-strong" aria-label="Mes anterior"><ChevronLeft size={18} /></Link>
      <span className="text-sm font-semibold">{formatMonth(month)}</span>
      <Link href={href(next)} className="rounded-xl p-2 text-muted hover:bg-surface-strong" aria-label="Mes siguiente"><ChevronRight size={18} /></Link>
    </div>
  );
}

export function parseMonth(v: string | string[] | undefined, fallback: string): string {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v) ? v : fallback;
}
