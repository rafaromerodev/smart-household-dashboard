import { type Range, inRange, type ISODate, daysBetween } from "./dates";

export interface ExpenseLike {
  spent_on: ISODate;
  amount_cents: number;
  category_id: string | null;
  store_id?: string | null;
}

export interface CategoryLike {
  id: string;
  parent_id: string | null;
}

/** Devuelve la categoría raíz (para agrupar subcategorías bajo su padre). */
export function rootCategory(categoryId: string | null, cats: CategoryLike[]): string | null {
  if (!categoryId) return null;
  const byId = new Map(cats.map((c) => [c.id, c]));
  let cur = byId.get(categoryId);
  let guard = 0;
  while (cur?.parent_id && guard++ < 10) cur = byId.get(cur.parent_id);
  return cur?.id ?? categoryId;
}

export function totalIn(expenses: ExpenseLike[], range: Range): number {
  return expenses.filter((e) => inRange(e.spent_on, range)).reduce((a, e) => a + e.amount_cents, 0);
}

/** Gasto en supermercados = gastos asociados a un establecimiento marcado como supermercado. */
export function supermarketTotal(expenses: ExpenseLike[], range: Range, supermarketIds: Set<string>): number {
  return expenses
    .filter((e) => inRange(e.spent_on, range) && e.store_id && supermarketIds.has(e.store_id))
    .reduce((a, e) => a + e.amount_cents, 0);
}

/**
 * Gasto por categoría raíz. Si un gasto tiene líneas, se reparten por línea
 * (el total no se cuenta dos veces: o se usan las líneas o el gasto entero).
 */
export function byRootCategory(
  expenses: (ExpenseLike & { id: string })[],
  cats: CategoryLike[],
  range: Range,
  lines: { expense_id: string; amount_cents: number; category_id: string | null }[] = [],
): Map<string | null, number> {
  const linesByExpense = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = linesByExpense.get(l.expense_id) ?? [];
    arr.push(l);
    linesByExpense.set(l.expense_id, arr);
  }
  const out = new Map<string | null, number>();
  const add = (cat: string | null, v: number) => {
    const k = rootCategory(cat, cats);
    out.set(k, (out.get(k) ?? 0) + v);
  };
  for (const e of expenses) {
    if (!inRange(e.spent_on, range)) continue;
    const ls = linesByExpense.get(e.id);
    if (ls && ls.length) ls.forEach((l) => add(l.category_id ?? e.category_id, l.amount_cents));
    else add(e.category_id, e.amount_cents);
  }
  return out;
}

export interface BudgetStatus {
  budget: number;
  spent: number;
  remaining: number; // negativo = excedido
  ratio: number; // gastado / presupuesto
  over: boolean;
  /** Proyección lineal al final del periodo según el ritmo actual (solo si el periodo está en curso). */
  projected: number | null;
}

export function budgetStatus(budget: number, spent: number, range?: Range, today?: ISODate): BudgetStatus {
  let projected: number | null = null;
  if (range && today && today >= range.from && today < range.to) {
    const elapsed = daysBetween(range.from, today) + 1;
    const total = daysBetween(range.from, range.to) + 1;
    projected = Math.round((spent / elapsed) * total);
  }
  return {
    budget,
    spent,
    remaining: budget - spent,
    ratio: budget > 0 ? spent / budget : 0,
    over: spent > budget,
    projected,
  };
}

/**
 * Concepto 2: reducción de gasto respecto al presupuesto. Solo tiene sentido
 * para un periodo cerrado; nunca se suma al dinero apartado.
 */
export function underBudget(budget: number, spent: number): number {
  return Math.max(0, budget - spent);
}

/** Convierte un presupuesto semanal a mensual o viceversa (aprox. 52/12 semanas por mes). */
export function scaleBudget(amount: number, from: "week" | "month", to: "week" | "month"): number {
  if (from === to) return amount;
  return from === "week" ? Math.round((amount * 52) / 12) : Math.round((amount * 12) / 52);
}
