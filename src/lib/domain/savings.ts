import { type ISODate, type Range, inRange, monthKey } from "./dates";

/**
 * Tres conceptos que NUNCA se suman entre sí:
 *  1. apartado        → dinero realmente movido a la hucha (movimientos de ahorro).
 *  2. bajoPresupuesto → cuánto se ha gastado por debajo del presupuesto.
 *  3. optimizacion    → ahorro por comprar mejor (estimado o comprobado).
 * Este módulo solo calcula (1). (2) está en budget.ts y (3) en pricing.ts.
 */

export interface SavingsMovement {
  occurred_on: ISODate;
  kind: "deposit" | "withdrawal";
  amount_cents: number;
}

export interface MonthlyTarget {
  valid_from: ISODate; // primer día de mes
  min_cents: number;
  max_cents: number;
}

export function signed(m: SavingsMovement): number {
  return m.kind === "deposit" ? m.amount_cents : -m.amount_cents;
}

/** Saldo disponible (aportaciones − retiradas) hasta una fecha incluida. */
export function balance(movs: SavingsMovement[], upTo?: ISODate): number {
  return movs.filter((m) => !upTo || m.occurred_on <= upTo).reduce((a, m) => a + signed(m), 0);
}

export function totals(movs: SavingsMovement[], range?: Range) {
  let deposits = 0;
  let withdrawals = 0;
  for (const m of movs) {
    if (range && !inRange(m.occurred_on, range)) continue;
    if (m.kind === "deposit") deposits += m.amount_cents;
    else withdrawals += m.amount_cents;
  }
  return { deposits, withdrawals, net: deposits - withdrawals };
}

/** Meta vigente para un mes (la más reciente con valid_from <= inicio de mes). */
export function targetForMonth(targets: MonthlyTarget[], month: string): MonthlyTarget | null {
  const first = month + "-01";
  let best: MonthlyTarget | null = null;
  for (const t of targets) {
    if (t.valid_from <= first && (!best || t.valid_from > best.valid_from)) best = t;
  }
  return best;
}

export type TargetStatus = "sin_meta" | "por_debajo" | "minimo" | "completo";

export interface MonthProgress {
  month: string;
  deposited: number; // aportaciones del mes
  withdrawn: number; // retiradas del mes
  net: number;
  target: MonthlyTarget | null;
  status: TargetStatus;
  /** 0–1 respecto al máximo de la meta, sobre las aportaciones netas */
  ratio: number;
  remainingToMin: number;
  remainingToMax: number;
}

/**
 * Progreso mensual. Se mide con el neto del mes (aportaciones − retiradas),
 * porque retirar dinero en el mismo mes reduce lo que de verdad queda apartado.
 */
export function monthProgress(movs: SavingsMovement[], targets: MonthlyTarget[], month: string): MonthProgress {
  let deposited = 0;
  let withdrawn = 0;
  for (const m of movs) {
    if (monthKey(m.occurred_on) !== month) continue;
    if (m.kind === "deposit") deposited += m.amount_cents;
    else withdrawn += m.amount_cents;
  }
  const net = deposited - withdrawn;
  const target = targetForMonth(targets, month);
  let status: TargetStatus = "sin_meta";
  if (target) status = net >= target.max_cents ? "completo" : net >= target.min_cents ? "minimo" : "por_debajo";
  const ratio = target && target.max_cents > 0 ? Math.max(0, Math.min(1, net / target.max_cents)) : 0;
  return {
    month,
    deposited,
    withdrawn,
    net,
    target,
    status,
    ratio,
    remainingToMin: target ? Math.max(0, target.min_cents - net) : 0,
    remainingToMax: target ? Math.max(0, target.max_cents - net) : 0,
  };
}

/** Serie de los meses indicados (p. ej. los 12 de un año) con objetivo vs. real. */
export function monthlySeries(movs: SavingsMovement[], targets: MonthlyTarget[], months: string[]): MonthProgress[] {
  return months.map((m) => monthProgress(movs, targets, m));
}

export function monthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

/** Valida una retirada: debe tener motivo y no dejar el saldo en negativo. */
export function validateWithdrawal(currentBalance: number, amount: number, reason: string | null | undefined): string | null {
  if (amount <= 0) return "El importe debe ser mayor que cero";
  if (!reason || !reason.trim()) return "Indica el motivo de la retirada";
  if (amount > currentBalance) return "No hay saldo suficiente en el ahorro";
  return null;
}
