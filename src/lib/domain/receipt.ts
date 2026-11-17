/**
 * Tickets: reparto de un total entre categorías sin duplicar importes,
 * validación de líneas extraídas y detección de duplicados.
 */

export interface ReceiptLine {
  description: string;
  amount_cents: number; // negativo para descuentos de línea
  category_id: string | null;
}

export interface ReceiptCheck {
  linesTotal: number;
  declaredTotal: number;
  difference: number; // declarado − líneas
  ok: boolean;
}

/** Comprueba que las líneas suman el total declarado (tolerancia en céntimos). */
export function checkReceipt(lines: ReceiptLine[], declaredTotal: number, toleranceCents = 0): ReceiptCheck {
  const linesTotal = lines.reduce((a, l) => a + l.amount_cents, 0);
  const difference = declaredTotal - linesTotal;
  return { linesTotal, declaredTotal, difference, ok: Math.abs(difference) <= toleranceCents };
}

/** Suma por categoría. La suma de los valores siempre es igual a la suma de líneas. */
export function splitByCategory(lines: ReceiptLine[], fallbackCategory: string | null = null): Map<string | null, number> {
  const out = new Map<string | null, number>();
  for (const l of lines) {
    const k = l.category_id ?? fallbackCategory;
    out.set(k, (out.get(k) ?? 0) + l.amount_cents);
  }
  return out;
}

/**
 * Reparte un descuento global del ticket (p. ej. descuento de empleado aplicado
 * al final) entre las líneas elegibles, proporcionalmente, sin perder céntimos.
 */
export function allocateDiscount(lines: ReceiptLine[], discountCents: number, eligible: (l: ReceiptLine) => boolean): ReceiptLine[] {
  const idx = lines.map((l, i) => ({ l, i })).filter(({ l }) => eligible(l) && l.amount_cents > 0);
  const base = idx.reduce((a, { l }) => a + l.amount_cents, 0);
  if (base === 0 || discountCents === 0) return lines.map((l) => ({ ...l }));
  const shares = idx.map(({ l, i }) => {
    const exact = (discountCents * l.amount_cents) / base;
    return { i, floor: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let rest = discountCents - shares.reduce((a, s) => a + s.floor, 0);
  shares.sort((a, b) => b.frac - a.frac);
  for (const s of shares) {
    if (rest <= 0) break;
    s.floor += 1;
    rest -= 1;
  }
  const out = lines.map((l) => ({ ...l }));
  for (const s of shares) out[s.i].amount_cents -= s.floor;
  return out;
}

/** Clave de posible duplicado aunque la foto sea distinta: misma tienda, fecha y total. */
export function duplicateKey(merchant: string, date: string, totalCents: number): string {
  const m = merchant
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${m}|${date}|${totalCents}`;
}

export function findPossibleDuplicates<T extends { merchant: string; spent_on: string; amount_cents: number }>(
  candidate: { merchant: string; spent_on: string; amount_cents: number },
  existing: T[],
): T[] {
  const k = duplicateKey(candidate.merchant, candidate.spent_on, candidate.amount_cents);
  return existing.filter((e) => duplicateKey(e.merchant, e.spent_on, e.amount_cents) === k);
}
