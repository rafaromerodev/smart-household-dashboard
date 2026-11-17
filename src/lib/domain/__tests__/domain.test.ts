import { describe, expect, it } from "vitest";
import { parseEurosToCents, percentOf, formatEuros } from "../money";
import { addMonths, periodRange, startOfWeek, isoWeekday, endOfMonth } from "../dates";
import { balance, monthProgress, targetForMonth, totals, validateWithdrawal, type SavingsMovement } from "../savings";
import { budgetStatus, byRootCategory, supermarketTotal, totalIn, underBudget, scaleBudget } from "../budget";
import { effectivePrice, compareBasket, capDiscount, optimizationSaving } from "../pricing";
import { allocateDiscount, checkReceipt, splitByCategory, findPossibleDuplicates } from "../receipt";
import { nextDueDate, seriesDates, mergeSessions } from "../recurrence";
import { buildNeeds, atRisk, parseIngredientLine } from "../shopping";
import { buckets, cumulative, previousRange } from "../series";

describe("money", () => {
  it.each([
    ["12,5", 1250], ["12.50", 1250], ["1.234,56", 123456], ["1,234.56", 123456],
    ["1.234", 123400], ["0.5", 50], ["€ 3", 300], ["7", 700], ["2,05", 205],
  ])("parsea %s → %i céntimos", (s, c) => expect(parseEurosToCents(s)).toBe(c));

  it.each(["", "abc", "1,234,5", "12,345"])("rechaza %s", (s) => {
    // "12,345" tiene 3 decimales → inválido como importe
    expect(parseEurosToCents(s)).toBeNull();
  });

  it("porcentaje redondea al céntimo", () => {
    expect(percentOf(1999, 8)).toBe(160); // 159,92 → 160
    expect(percentOf(1000, 8)).toBe(80);
  });

  it("formatea en euros", () => expect(formatEuros(123456).replace(/\s/g, " ")).toMatch(/1\.?234,56 €/));
});

describe("fechas", () => {
  it("semana empieza en lunes", () => {
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09"); // lunes
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09"); // domingo
    expect(isoWeekday("2026-11-15")).toBe(7);
  });
  it("periodos", () => {
    expect(periodRange("month", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("year", "2026-02-10")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
    expect(periodRange("week", "2026-11-12")).toEqual({ from: "2026-11-09", to: "2026-11-15" });
    expect(() => periodRange("custom", "2026-01-01", { from: "2026-02-01", to: "2026-01-01" })).toThrow();
  });
  it("sumar meses ajusta fin de mes", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(endOfMonth("2028-02-03")).toBe("2028-02-29");
  });
});

describe("ahorro", () => {
  const movs: SavingsMovement[] = [
    { occurred_on: "2026-10-05", kind: "deposit", amount_cents: 2500 },
    { occurred_on: "2026-11-02", kind: "deposit", amount_cents: 1500 },
    { occurred_on: "2026-11-20", kind: "deposit", amount_cents: 1000 },
    { occurred_on: "2026-11-25", kind: "withdrawal", amount_cents: 500 },
  ];
  const targets = [
    { valid_from: "2026-10-01", min_cents: 2000, max_cents: 3000 },
    { valid_from: "2026-12-01", min_cents: 4000, max_cents: 4000 },
  ];

  it("saldo = aportaciones − retiradas", () => {
    expect(balance(movs)).toBe(4500);
    expect(balance(movs, "2026-10-31")).toBe(2500);
    expect(totals(movs)).toEqual({ deposits: 5000, withdrawals: 500, net: 4500 });
  });

  it("meta vigente según historial (cambiar la meta no altera meses pasados)", () => {
    expect(targetForMonth(targets, "2026-09")).toBeNull();
    expect(targetForMonth(targets, "2026-11")?.max_cents).toBe(3000);
    expect(targetForMonth(targets, "2027-03")?.min_cents).toBe(4000);
  });

  it("progreso mensual usa el neto del mes", () => {
    const p = monthProgress(movs, targets, "2026-11");
    expect(p.deposited).toBe(2500);
    expect(p.withdrawn).toBe(500);
    expect(p.net).toBe(2000);
    expect(p.status).toBe("minimo");
    expect(p.remainingToMax).toBe(1000);
    expect(p.ratio).toBeCloseTo(2000 / 3000);
    expect(monthProgress(movs, targets, "2026-10").status).toBe("minimo");
    expect(monthProgress([{ occurred_on: "2026-10-01", kind: "deposit", amount_cents: 3000 }], targets, "2026-10").status).toBe("completo");
    expect(monthProgress(movs, targets, "2026-09").status).toBe("sin_meta");
  });

  it("valida retiradas", () => {
    expect(validateWithdrawal(1000, 500, "")).toMatch(/motivo/);
    expect(validateWithdrawal(1000, 1500, "Viaje")).toMatch(/saldo/);
    expect(validateWithdrawal(1000, 500, "Viaje")).toBeNull();
  });
});

describe("presupuestos y gastos", () => {
  const cats = [
    { id: "ali", parent_id: null },
    { id: "super", parent_id: "ali" },
    { id: "lim", parent_id: null },
    { id: "hig", parent_id: null },
  ];
  const exps = [
    { id: "e1", spent_on: "2026-11-02", amount_cents: 4500, category_id: "super", store_id: "carrefour" },
    { id: "e2", spent_on: "2026-11-03", amount_cents: 1000, category_id: "lim", store_id: null },
    { id: "e3", spent_on: "2026-10-31", amount_cents: 9999, category_id: "ali", store_id: "mercadona" },
  ];
  const nov = { from: "2026-11-01", to: "2026-11-30" };

  it("totales del periodo y supermercado", () => {
    expect(totalIn(exps, nov)).toBe(5500);
    expect(supermarketTotal(exps, nov, new Set(["carrefour", "mercadona"]))).toBe(4500);
  });

  it("agrupa subcategorías en su raíz y usa líneas sin duplicar el total", () => {
    const lines = [
      { expense_id: "e1", amount_cents: 3000, category_id: "super" },
      { expense_id: "e1", amount_cents: 800, category_id: "hig" },
      { expense_id: "e1", amount_cents: 700, category_id: "lim" },
    ];
    const m = byRootCategory(exps, cats, nov, lines);
    expect(m.get("ali")).toBe(3000);
    expect(m.get("hig")).toBe(800);
    expect(m.get("lim")).toBe(1700);
    const sum = [...m.values()].reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalIn(exps, nov));
  });

  it("estado del presupuesto y proyección", () => {
    const s = budgetStatus(40000, 20000, nov, "2026-11-10");
    expect(s.remaining).toBe(20000);
    expect(s.over).toBe(false);
    expect(s.projected).toBe(60000);
    expect(budgetStatus(100, 150).over).toBe(true);
    expect(underBudget(40000, 35000)).toBe(5000);
    expect(underBudget(40000, 45000)).toBe(0);
    expect(scaleBudget(10000, "week", "month")).toBe(43333);
  });
});

describe("descuento de empleado y precios", () => {
  const carrefour = { employee_discount_pct: 8, discount_confirmed: true, discount_stacks_with_promos: false };

  it("aplica 8% solo a artículos elegibles y confirmados", () => {
    expect(effectivePrice({ label_price_cents: 1000, eligible: true }, carrefour).effective).toBe(920);
    expect(effectivePrice({ label_price_cents: 1000, eligible: false }, carrefour).effective).toBe(1000);
    expect(effectivePrice({ label_price_cents: 1000 }, carrefour).effective).toBe(1000); // desconocido
    expect(effectivePrice({ label_price_cents: 1000, eligible: true }, { ...carrefour, discount_confirmed: false }).effective).toBe(1000);
  });

  it("no aplica dos veces un descuento ya incluido", () => {
    const r = effectivePrice({ label_price_cents: 920, eligible: true, employee_discount_already_applied: true }, carrefour);
    expect(r.effective).toBe(920);
    expect(r.employeeDiscount).toBe(0);
  });

  it("acumulación con promociones", () => {
    const promo = { label_price_cents: 1000, promo_price_cents: 800, eligible: true };
    expect(effectivePrice(promo, carrefour).effective).toBe(800); // no acumulable
    expect(effectivePrice(promo, { ...carrefour, discount_stacks_with_promos: null }).effective).toBe(800); // desconocido
    const stack = effectivePrice(promo, { ...carrefour, discount_stacks_with_promos: true });
    expect(stack.employeeDiscount).toBe(64);
    expect(stack.effective).toBe(736);
  });

  it("tope mensual", () => {
    expect(capDiscount(500, 0, null)).toBe(500);
    expect(capDiscount(500, 4800, 5000)).toBe(200);
    expect(capDiscount(500, 5000, 5000)).toBe(0);
  });

  it("compara cesta: todo en una tienda vs. repartir", () => {
    const lines = [
      { key: "leche", qty: 6, prices: { M: 95, C: 92 } },
      { key: "pan", qty: 1, prices: { M: 120, C: 140 } },
    ];
    const { options, best } = compareBasket(lines, ["M", "C"], 0);
    expect(options.find((o) => o.stores[0] === "M" && o.kind === "single")!.total).toBe(690);
    expect(options.find((o) => o.stores[0] === "C" && o.kind === "single")!.total).toBe(692);
    expect(best!.kind).toBe("split");
    expect(best!.total).toBe(672);
    // con penalización por desplazamiento, mejor una sola tienda
    expect(compareBasket(lines, ["M", "C"], 300).best!.stores).toEqual(["M"]);
  });

  it("no da por buena una opción con precios desconocidos", () => {
    const { best } = compareBasket([{ key: "x", qty: 1, prices: { M: 100 } }], ["M", "C"]);
    expect(best!.stores).toEqual(["M"]);
    expect(compareBasket([{ key: "x", qty: 1, prices: {} }], ["M"]).best).toBeNull();
  });

  it("ahorro por optimización nunca negativo", () => {
    expect(optimizationSaving(1000, 900, false)).toEqual({ amount: 100, verified: false });
    expect(optimizationSaving(900, 1000, true).amount).toBe(0);
  });
});

describe("tickets", () => {
  const lines = [
    { description: "Pollo", amount_cents: 650, category_id: "ali" },
    { description: "Champú", amount_cents: 320, category_id: "hig" },
    { description: "Detergente", amount_cents: 899, category_id: "lim" },
    { description: "Tomates", amount_cents: 231, category_id: "ali" },
  ];

  it("comprueba el total y reparte por categoría sin duplicar", () => {
    expect(checkReceipt(lines, 2100).ok).toBe(true);
    expect(checkReceipt(lines, 2110).difference).toBe(10);
    const s = splitByCategory(lines);
    expect(s.get("ali")).toBe(881);
    expect([...s.values()].reduce((a, b) => a + b, 0)).toBe(2100);
  });

  it("reparte un descuento global solo entre líneas elegibles sin perder céntimos", () => {
    const out = allocateDiscount(lines, 70, (l) => l.category_id === "ali");
    expect(out.reduce((a, l) => a + l.amount_cents, 0)).toBe(2100 - 70);
    expect(out[1].amount_cents).toBe(320);
    expect(out[2].amount_cents).toBe(899);
  });

  it("detecta posibles duplicados por tienda+fecha+total", () => {
    const existing = [{ merchant: "Carrefour Market", spent_on: "2026-11-02", amount_cents: 2100 }];
    expect(findPossibleDuplicates({ merchant: "carrefour  market", spent_on: "2026-11-02", amount_cents: 2100 }, existing)).toHaveLength(1);
    expect(findPossibleDuplicates({ merchant: "Carrefour Market", spent_on: "2026-11-03", amount_cents: 2100 }, existing)).toHaveLength(0);
  });
});

describe("recurrencias", () => {
  it("siguiente fecha de tareas", () => {
    expect(nextDueDate("2026-11-09", "weekly", "2026-11-09")).toBe("2026-11-16");
    expect(nextDueDate("2026-11-01", "weekly", "2026-11-20")).toBe("2026-11-22"); // completada tarde
    expect(nextDueDate("2026-01-31", "monthly", "2026-01-31")).toBe("2026-02-28");
    expect(nextDueDate(null, "daily", "2026-11-09")).toBe("2026-11-10");
    expect(nextDueDate("2026-11-09", "none", "2026-11-09")).toBeNull();
  });

  it("clases recurrentes en un rango", () => {
    const s = { id: "s", weekday: 2, starts_on: "2026-11-01", ends_on: "2026-11-20" };
    expect(seriesDates(s, { from: "2026-11-01", to: "2026-11-30" })).toEqual(["2026-11-03", "2026-11-10", "2026-11-17"]);
    const m = mergeSessions([s], [{ series_id: "s", session_date: "2026-11-10" }], { from: "2026-11-01", to: "2026-11-30" });
    expect(m.virtual.map((v) => v.date)).toEqual(["2026-11-03", "2026-11-17"]);
  });
});

describe("series del gráfico de gasto", () => {
  it("tramos diarios o mensuales según la duración", () => {
    expect(buckets({ from: "2026-11-01", to: "2026-11-30" })).toHaveLength(30);
    const y = buckets({ from: "2026-01-01", to: "2026-12-31" });
    expect(y).toHaveLength(12);
    expect(y[1]).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
  it("acumula sin contar lo anterior al rango y deja vacío el futuro", () => {
    const bs = buckets({ from: "2026-11-01", to: "2026-11-05" });
    const items = [
      { spent_on: "2026-10-31", amount_cents: 999 },
      { spent_on: "2026-11-01", amount_cents: 100 },
      { spent_on: "2026-11-03", amount_cents: 50 },
      { spent_on: "2026-11-03", amount_cents: 25 },
    ];
    expect(cumulative(items, bs, "2026-11-04")).toEqual([100, 100, 175, 175, null]);
  });
  it("periodo anterior equivalente", () => {
    expect(previousRange("month", { from: "2026-03-01", to: "2026-03-31" })).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(previousRange("week", { from: "2026-11-09", to: "2026-11-15" })).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(previousRange("custom", { from: "2026-11-10", to: "2026-11-12" })).toEqual({ from: "2026-11-07", to: "2026-11-09" });
  });
});

describe("lista de compra desde menú", () => {
  it("agrega ingredientes repetidos, escala raciones y descuenta inventario", () => {
    const needs = buildNeeds(
      [
        { title: "Tortilla", servings: 2, recipeServings: 4, ingredients: [{ name: "Huevos", quantity: 6, unit: "ud" }, { name: "Patata", quantity: 0.5, unit: "kg" }] },
        { title: "Ensalada", servings: 2, recipeServings: 2, ingredients: [{ name: "huevos", quantity: 2, unit: "uds" }, { name: "Sal", quantity: null, unit: null }] },
        { title: "Puré", servings: 2, recipeServings: 2, ingredients: [{ name: "Patata", quantity: 300, unit: "g" }] },
      ],
      [{ name: "Huevos", quantity: 4, unit: "ud" }, { name: "Sal", quantity: null, unit: null }],
    );
    const huevos = needs.find((n) => n.name.toLowerCase() === "huevos")!;
    expect(huevos.needed).toBe(5);
    expect(huevos.toBuy).toBe(1);
    expect(huevos.repeated).toBe(true);
    const patata = needs.find((n) => n.name === "Patata")!;
    expect(patata.needed).toBe(550);
    expect(patata.unit).toBe("g");
    const sal = needs.find((n) => n.name === "Sal")!;
    expect(sal.needed).toBeNull();
    expect(sal.covered).toBe(true);
  });

  it.each([
    ["200 g arroz", { name: "arroz", quantity: 200, unit: "g" }],
    ["1,5 kg de patatas", { name: "patatas", quantity: 1.5, unit: "kg" }],
    ["2 huevos", { name: "huevos", quantity: 2, unit: "ud" }],
    ["- 1/2 l leche", { name: "leche", quantity: 0.5, unit: "l" }],
    ["sal", { name: "sal", quantity: null, unit: null }],
    ["3 dientes de ajo", { name: "dientes de ajo", quantity: 3, unit: "ud" }],
  ])("interpreta ingrediente «%s»", (line, exp) => expect(parseIngredientLine(line)).toEqual(exp));

  it("productos con riesgo de desperdicio", () => {
    const items = [{ expires_on: "2026-11-10" }, { expires_on: "2026-11-30" }, { expires_on: null }, { expires_on: "2026-11-01" }];
    expect(atRisk(items, "2026-11-09", "2026-11-12")).toHaveLength(1);
  });
});
