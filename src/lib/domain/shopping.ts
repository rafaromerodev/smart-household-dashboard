/**
 * Generación de lista de compra a partir del menú: agrega ingredientes
 * repetidos, escala por raciones y descuenta lo que ya hay en casa.
 */

export interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface PlannedMeal {
  title: string;
  servings: number;
  recipeServings: number;
  ingredients: Ingredient[];
}

export interface InventoryItem {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface NeedLine {
  name: string;
  unit: string | null;
  needed: number | null; // null = cantidad no especificada
  inStock: number | null;
  toBuy: number | null;
  usedIn: string[]; // platos en los que aparece
  repeated: boolean;
  covered: boolean; // ya lo tenemos en cantidad suficiente
}

export function normalizeName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

const UNIT_ALIASES: Record<string, string> = {
  gr: "g", gramos: "g", gramo: "g", g: "g",
  kg: "kg", kilo: "kg", kilos: "kg",
  ml: "ml", l: "l", litro: "l", litros: "l",
  ud: "ud", uds: "ud", unidad: "ud", unidades: "ud", u: "ud",
};

export function normalizeUnit(u: string | null): string | null {
  if (!u) return null;
  const k = normalizeName(u);
  return UNIT_ALIASES[k] ?? k;
}

/** Pasa a unidad base (g, ml, ud) para poder sumar kg con g, l con ml. */
function toBase(q: number, unit: string | null): { q: number; unit: string | null } {
  if (unit === "kg") return { q: q * 1000, unit: "g" };
  if (unit === "l") return { q: q * 1000, unit: "ml" };
  return { q, unit };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function buildNeeds(meals: PlannedMeal[], inventory: InventoryItem[] = []): NeedLine[] {
  const acc = new Map<string, { name: string; unit: string | null; qty: number | null; usedIn: Set<string> }>();
  for (const meal of meals) {
    const factor = meal.recipeServings > 0 ? meal.servings / meal.recipeServings : 1;
    for (const ing of meal.ingredients) {
      const base = toBase((ing.quantity ?? 0) * factor, normalizeUnit(ing.unit));
      const key = `${normalizeName(ing.name)}|${base.unit ?? ""}`;
      const cur = acc.get(key) ?? { name: ing.name.trim(), unit: base.unit, qty: null, usedIn: new Set<string>() };
      // Cantidad = suma de las cantidades conocidas; null si ninguna aparición la indica.
      if (ing.quantity != null) cur.qty = (cur.qty ?? 0) + base.q;
      cur.usedIn.add(meal.title);
      acc.set(key, cur);
    }
  }

  const stock = new Map<string, number>();
  for (const it of inventory) {
    const b = toBase(it.quantity ?? 0, normalizeUnit(it.unit));
    const key = `${normalizeName(it.name)}|${b.unit ?? ""}`;
    stock.set(key, (stock.get(key) ?? 0) + b.q);
  }
  const stockedNames = new Set(inventory.map((i) => normalizeName(i.name)));

  const out: NeedLine[] = [];
  for (const [key, v] of acc) {
    const have = stock.get(key) ?? null;
    let toBuy: number | null = v.qty;
    let covered = false;
    if (v.qty != null && have != null) {
      toBuy = round3(Math.max(0, v.qty - have));
      covered = toBuy === 0;
    } else if (v.qty == null && stockedNames.has(normalizeName(v.name))) {
      covered = true; // sin cantidad: si lo tenemos, se asume cubierto (se muestra para revisar)
      toBuy = null;
    }
    out.push({
      name: v.name,
      unit: v.unit,
      needed: v.qty == null ? null : round3(v.qty),
      inStock: have,
      toBuy,
      usedIn: [...v.usedIn],
      repeated: v.usedIn.size > 1,
      covered,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * Interpreta una línea de ingrediente escrita a mano:
 * "200 g arroz", "2 huevos", "1,5 kg de patatas", "sal" → {quantity, unit, name}
 */
export function parseIngredientLine(line: string): Ingredient | null {
  const s = line.trim().replace(/^[-*•]\s*/, "");
  if (!s) return null;
  const m = s.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-zA-ZáéíóúÁÉÍÓÚ]+\.?)?\s+(de\s+)?(.+)$/);
  if (!m) return { name: s, quantity: null, unit: null };
  const [, qRaw, unitRaw, de, tail] = m;
  const rest = (de ?? "") + tail;
  const quantity = qRaw.includes("/") ? Number(qRaw.split("/")[0]) / Number(qRaw.split("/")[1]) : Number(qRaw.replace(",", "."));
  const unitNorm = unitRaw ? normalizeUnit(unitRaw.replace(".", "")) : null;
  const known = unitNorm != null && Object.values(UNIT_ALIASES).includes(unitNorm);
  if (unitRaw && !known) {
    // "2 huevos": la palabra no es una unidad, forma parte del nombre
    return { name: `${unitRaw} ${rest}`.trim(), quantity, unit: "ud" };
  }
  return { name: tail.trim(), quantity, unit: unitNorm ?? "ud" };
}

/** Productos del inventario que caducan en los próximos `days` días. */
export function atRisk<T extends { expires_on: string | null }>(items: T[], today: string, untilISO: string): T[] {
  return items.filter((i) => i.expires_on != null && i.expires_on >= today && i.expires_on <= untilISO);
}
