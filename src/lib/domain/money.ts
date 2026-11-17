// Importes siempre en céntimos (enteros) para evitar errores de coma flotante.

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatEuros(cents: number): string {
  return fmt.format(cents / 100);
}

/**
 * Convierte texto introducido por el usuario ("12,5", "12.50", "1.234,56", "€ 3")
 * a céntimos. Devuelve null si no es un importe válido.
 */
export function parseEurosToCents(input: string): number | null {
  let s = input.trim().replace(/€|\s/g, "");
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // El último separador es el decimal; el otro, de miles.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  } else if (hasDot && /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    // "1.234" o "12.345.678" → separador de miles (formato español)
    s = s.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const [ent, dec = ""] = s.split(".");
  const sign = ent.startsWith("-") ? -1 : 1;
  const cents = Math.abs(parseInt(ent, 10)) * 100 + parseInt((dec + "00").slice(0, 2), 10);
  return sign * cents;
}

export function sumCents(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Porcentaje entero de un importe, redondeando al céntimo (half-up). */
export function percentOf(cents: number, pct: number): number {
  return Math.round((cents * pct) / 100);
}
