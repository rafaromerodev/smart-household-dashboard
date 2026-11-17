import { percentOf } from "./money";

/**
 * Modelo de precio de un artículo en un establecimiento:
 *   precio de etiqueta → promoción (si hay) → descuento de empleado (si elegible) → precio efectivo.
 * Reglas:
 *  - El descuento de empleado solo se aplica si el establecimiento lo tiene CONFIRMADO
 *    y el artículo es elegible de forma explícita (por defecto: no elegible).
 *  - Si el precio observado ya incluye el descuento (p. ej. procede de un ticket donde
 *    ya se aplicó), no se vuelve a aplicar.
 *  - Si no se sabe si acumula con promociones, se asume que NO acumula (escenario prudente).
 */

export interface StoreDiscountConfig {
  employee_discount_pct: number;
  discount_confirmed: boolean;
  discount_stacks_with_promos: boolean | null;
}

export interface PriceInput {
  label_price_cents: number;
  promo_price_cents?: number | null;
  employee_discount_already_applied?: boolean;
  eligible?: boolean | null; // null/undefined = desconocido → no elegible
}

export interface PriceBreakdown {
  label: number;
  promo: number | null;
  afterPromo: number;
  employeeDiscount: number;
  effective: number;
  notes: string[];
}

export function effectivePrice(p: PriceInput, store: StoreDiscountConfig): PriceBreakdown {
  const notes: string[] = [];
  const hasPromo = p.promo_price_cents != null && p.promo_price_cents < p.label_price_cents;
  const afterPromo = hasPromo ? p.promo_price_cents! : p.label_price_cents;
  let employeeDiscount = 0;

  if (store.employee_discount_pct > 0) {
    if (p.employee_discount_already_applied) {
      notes.push("El precio ya incluye el descuento de empleado");
    } else if (!store.discount_confirmed) {
      notes.push("Descuento sin confirmar: no aplicado");
    } else if (p.eligible !== true) {
      notes.push(p.eligible === false ? "Artículo excluido del descuento" : "Elegibilidad desconocida: no aplicado");
    } else if (hasPromo && store.discount_stacks_with_promos !== true) {
      notes.push(
        store.discount_stacks_with_promos === false
          ? "No acumulable con la promoción"
          : "Acumulación con promociones desconocida: no aplicado",
      );
    } else {
      employeeDiscount = percentOf(afterPromo, store.employee_discount_pct);
    }
  }

  return {
    label: p.label_price_cents,
    promo: hasPromo ? p.promo_price_cents! : null,
    afterPromo,
    employeeDiscount,
    effective: afterPromo - employeeDiscount,
    notes,
  };
}

/** Aplica un tope mensual al descuento acumulado (si el establecimiento lo tiene). */
export function capDiscount(requested: number, usedThisMonth: number, monthlyCap: number | null | undefined): number {
  if (monthlyCap == null) return requested;
  return Math.max(0, Math.min(requested, monthlyCap - usedThisMonth));
}

// ---------------------------------------------------------------------
// Comparación de cesta entre establecimientos
// ---------------------------------------------------------------------

export interface BasketLine {
  key: string; // producto
  qty: number;
  /** Precio efectivo unitario por tienda; ausente = sin dato fiable */
  prices: Record<string, number | undefined>;
}

export interface BasketOption {
  kind: "single" | "split";
  stores: string[];
  total: number;
  /** Productos sin precio conocido en la(s) tienda(s) de la opción */
  missing: string[];
  assignment: Record<string, string>; // producto → tienda
}

export function compareBasket(lines: BasketLine[], stores: string[], splitPenaltyCents = 0): {
  options: BasketOption[];
  best: BasketOption | null;
} {
  const options: BasketOption[] = [];
  for (const s of stores) {
    let total = 0;
    const missing: string[] = [];
    const assignment: Record<string, string> = {};
    for (const l of lines) {
      const p = l.prices[s];
      if (p == null) missing.push(l.key);
      else {
        total += Math.round(p * l.qty);
        assignment[l.key] = s;
      }
    }
    options.push({ kind: "single", stores: [s], total, missing, assignment });
  }

  if (stores.length >= 2) {
    let total = 0;
    const missing: string[] = [];
    const assignment: Record<string, string> = {};
    for (const l of lines) {
      let bestStore: string | null = null;
      for (const s of stores) {
        const p = l.prices[s];
        if (p != null && (bestStore == null || p < l.prices[bestStore]!)) bestStore = s;
      }
      if (!bestStore) missing.push(l.key);
      else {
        total += Math.round(l.prices[bestStore]! * l.qty);
        assignment[l.key] = bestStore;
      }
    }
    const used = [...new Set(Object.values(assignment))];
    if (used.length > 1) {
      options.push({ kind: "split", stores: used, total: total + splitPenaltyCents, missing, assignment });
    }
  }

  // Solo son comparables las opciones con datos completos.
  const complete = options.filter((o) => o.missing.length === 0);
  const best = complete.length ? complete.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  return { options, best };
}

/**
 * Concepto 3: ahorro por optimización = diferencia entre la alternativa de
 * referencia (lo que habríamos pagado) y lo pagado. "Comprobado" solo si ambos
 * importes proceden de tickets reales.
 */
export function optimizationSaving(referenceCents: number, paidCents: number, verified: boolean) {
  return { amount: Math.max(0, referenceCents - paidCents), verified };
}
