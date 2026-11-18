// Fictional data for screenshots and the public demo. Everything here is invented.
// It goes through a signed-in client, so it obeys the same RLS policies as the app.

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Deterministic pseudo-random numbers, so every reset produces the same household. */
function random(seed = 7) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/**
 * Fills a freshly created household.
 * @param db       Supabase client signed in as a member of the household
 * @param members  { main: member id, partner?: member id }
 */
export async function seedHouseholdData(db, { members, today = new Date() }) {
  // Columns left out of a multi-row insert must take their database default, not null.
  const insert = (table, rows) => db.from(table).insert(rows, { defaultToNull: false });
  const rnd = random();
  const main = members.main;
  const partner = members.partner ?? members.main;

  const cats = await must(db.from("categories").select("id,name").is("parent_id", null), "categories");
  const stores = await must(db.from("stores").select("id,name"), "stores");
  const cat = (n) => cats.find((c) => c.name === n).id;
  const store = (n) => stores.find((s) => s.name === n)?.id ?? null;

  // ~3 months of expenses: weekly shop, eating out, fuel, pharmacy, fixed bills and personal spending.
  const expenses = [];
  for (let back = 92; back >= 0; back--) {
    const d = addDays(today, -back);
    const payer = rnd() > 0.5 ? main : partner;
    if (d.getDay() === 6) {
      const shop = rnd() > 0.5 ? "Mercadona" : "Carrefour";
      expenses.push({ spent_on: iso(d), merchant: shop, store_id: store(shop), amount_cents: 7000 + Math.round(rnd() * 5000), category_id: cat("Alimentación"), member_id: payer, payment_method: "tarjeta" });
    }
    if (rnd() > 0.84) expenses.push({ spent_on: iso(d), merchant: "Bar El Puerto", amount_cents: 1500 + Math.round(rnd() * 3500), category_id: cat("Restaurantes"), member_id: payer });
    if (rnd() > 0.91) expenses.push({ spent_on: iso(d), merchant: "Gasolinera", amount_cents: 4000 + Math.round(rnd() * 2000), category_id: cat("Transporte y combustible"), member_id: payer });
    if (rnd() > 0.94) expenses.push({ spent_on: iso(d), merchant: "Farmacia", amount_cents: 800 + Math.round(rnd() * 1500), category_id: cat("Salud y deporte"), member_id: payer });
    if (rnd() > 0.93) expenses.push({ spent_on: iso(d), merchant: "Librería", amount_cents: 1200 + Math.round(rnd() * 1800), category_id: cat("Ocio"), member_id: payer, scope: "personal" });
    if (d.getDate() === 1) {
      expenses.push({ spent_on: iso(d), merchant: "Alquiler", amount_cents: 65000, category_id: cat("Vivienda"), member_id: main, payment_method: "transferencia" });
      expenses.push({ spent_on: iso(d), merchant: "Fibra y móvil", amount_cents: 3990, category_id: cat("Vivienda"), member_id: partner, payment_method: "domiciliación" });
    }
    if (d.getDate() === 12) expenses.push({ spent_on: iso(d), merchant: "Compañía eléctrica", amount_cents: 5200 + Math.round(rnd() * 2400), category_id: cat("Vivienda"), member_id: main, payment_method: "domiciliación" });
  }
  await must(insert("expenses", expenses), "expenses");

  await must(insert("budgets", [
    { period: "month", amount_cents: 150000 },
    { period: "month", amount_cents: 45000, category_id: cat("Alimentación") },
    { period: "month", amount_cents: 12000, category_id: cat("Restaurantes") },
  ]), "budgets");

  // Savings: the default monthly goal plus a holiday pot.
  const monthly = await must(db.from("savings_goals").select("id").eq("kind", "monthly").single(), "monthly goal");
  const holidays = await must(insert("savings_goals", { name: "Vacaciones", kind: "target", target_cents: 80000, target_date: iso(addDays(today, 200)) }).select("id").single(), "holiday goal");
  const movements = [];
  for (let m = 3; m >= 0; m--) {
    const d = addDays(today, -30 * m);
    movements.push({ goal_id: monthly.id, occurred_on: iso(d), kind: "deposit", amount_cents: 2000 + Math.round(rnd() * 1000), concept: "Hucha del mes", member_id: m % 2 ? main : partner });
    movements.push({ goal_id: holidays.id, occurred_on: iso(d), kind: "deposit", amount_cents: 6000, concept: "Aportación", member_id: m % 2 ? partner : main });
  }
  movements.push({ goal_id: holidays.id, occurred_on: iso(addDays(today, -20)), kind: "withdrawal", amount_cents: 4500, reason: "Reserva del alojamiento", member_id: main });
  await must(insert("savings_movements", movements), "savings movements");

  // Recipes, this week's menu, shopping list and pantry.
  const recipes = await must(insert("recipes", [
    { name: "Lentejas con verduras", servings: 4, tags: ["cuchara"], is_favorite: true },
    { name: "Tortilla de patatas", servings: 2, tags: ["rápida"] },
    { name: "Ensalada de garbanzos", servings: 2, tags: ["verano", "rápida"] },
  ]).select("id,name"), "recipes");
  const recipe = (n) => recipes.find((r) => r.name === n).id;
  await must(insert("recipe_ingredients", [
    { recipe_id: recipe("Lentejas con verduras"), name: "lentejas", quantity: 400, unit: "g", sort_order: 1 },
    { recipe_id: recipe("Lentejas con verduras"), name: "zanahoria", quantity: 2, unit: "ud", sort_order: 2 },
    { recipe_id: recipe("Lentejas con verduras"), name: "pimiento", quantity: 1, unit: "ud", sort_order: 3 },
    { recipe_id: recipe("Tortilla de patatas"), name: "huevos", quantity: 5, unit: "ud", sort_order: 1 },
    { recipe_id: recipe("Tortilla de patatas"), name: "patatas", quantity: 600, unit: "g", sort_order: 2 },
    { recipe_id: recipe("Ensalada de garbanzos"), name: "garbanzos cocidos", quantity: 400, unit: "g", sort_order: 1 },
    { recipe_id: recipe("Ensalada de garbanzos"), name: "tomate", quantity: 2, unit: "ud", sort_order: 2 },
  ]), "recipe ingredients");
  await must(insert("meal_plan", [
    { plan_date: iso(today), meal: "comida", title: "Lentejas con verduras", recipe_id: recipe("Lentejas con verduras") },
    { plan_date: iso(today), meal: "cena", title: "Tortilla de patatas", recipe_id: recipe("Tortilla de patatas") },
    { plan_date: iso(addDays(today, 1)), meal: "comida", title: "Ensalada de garbanzos", recipe_id: recipe("Ensalada de garbanzos") },
  ]), "meal plan");
  const list = await must(db.from("shopping_lists").select("id").single(), "shopping list");
  await must(insert("shopping_items", [
    { list_id: list.id, name: "leche", quantity: 2, unit: "l" },
    { list_id: list.id, name: "pan" },
    { list_id: list.id, name: "tomate", quantity: 2, unit: "ud", source: "menu" },
    { list_id: list.id, name: "café", checked: true },
  ]), "shopping items");
  await must(insert("inventory_items", [
    { name: "yogures", quantity: 4, unit: "ud", location: "nevera", expires_on: iso(addDays(today, 2)) },
    { name: "pechuga de pollo", quantity: 500, unit: "g", location: "congelador", expires_on: iso(addDays(today, 40)) },
    { name: "arroz", quantity: 1, unit: "kg", location: "despensa" },
  ]), "pantry");

  // Workouts and chores.
  const weekday = ((today.getDay() + 6) % 7) + 1;
  await must(insert("workout_series", [
    { member_id: main, activity: "Pilates", weekday, start_time: "19:00", duration_min: 55, starts_on: iso(addDays(today, -60)) },
    { member_id: partner, activity: "Natación", weekday: (weekday % 7) + 1, start_time: "08:00", duration_min: 45, starts_on: iso(addDays(today, -60)) },
  ]), "workout series");
  await must(insert("workouts", [
    { member_id: main, activity: "Correr", session_date: iso(addDays(today, -1)), status: "realizado", duration_min: 40 },
    { member_id: partner, activity: "Bicicleta", session_date: iso(addDays(today, -3)), status: "realizado", duration_min: 60 },
  ]), "workouts");
  await must(insert("tasks", [
    { title: "Preparar el menú semanal", due_date: iso(today), recurrence: "weekly", assignee_id: main },
    { title: "Revisar la nevera", due_date: iso(today), priority: "alta" },
    { title: "Pagar la comunidad", due_date: iso(addDays(today, 5)), assignee_id: partner, category: "casa" },
    { title: "Cambiar las sábanas", due_date: iso(addDays(today, -2)), status: "hecha", completed_at: addDays(today, -2).toISOString() },
  ]), "tasks");
}
