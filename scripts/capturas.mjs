// Capturas de diseño: crea una cuenta de PRUEBA en el Supabase LOCAL con datos de ejemplo
// (solo para revisar el aspecto de gráficos y tarjetas; nunca se usa en producción)
// y fotografía las pantallas principales en escritorio y móvil.
// Uso: node scripts/capturas.mjs http://localhost:3210 <carpeta>
import { createClient } from "@supabase/supabase-js";
import { chromium, devices } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? ".";
const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const email = `capturas-${Date.now().toString(36)}@test.local`;
const password = "contraseña-segura-1";

const db = createClient(URL, ANON, { auth: { persistSession: false } });
await db.auth.signUp({ email, password });
await db.rpc("create_household", { p_name: "Casa de prueba", p_display_name: "Ana" });

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const { data: cats } = await db.from("categories").select("id,name").is("parent_id", null);
const { data: stores } = await db.from("stores").select("id,name");
const cat = (n) => cats.find((c) => c.name === n).id;
const store = (n) => stores.find((s) => s.name === n).id;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rows = [];
for (let back = 45; back >= 0; back--) {
  const d = new Date(today); d.setDate(d.getDate() - back);
  if (d.getDay() === 6) rows.push({ spent_on: iso(d), merchant: rnd() > 0.5 ? "Mercadona" : "Carrefour", store_id: store(rnd() > 0.5 ? "Mercadona" : "Carrefour"), amount_cents: 8000 + Math.round(rnd() * 4000), category_id: cat("Alimentación") });
  if (rnd() > 0.82) rows.push({ spent_on: iso(d), merchant: "Bar El Puerto", amount_cents: 1500 + Math.round(rnd() * 3000), category_id: cat("Restaurantes") });
  if (rnd() > 0.9) rows.push({ spent_on: iso(d), merchant: "Repsol", amount_cents: 4000 + Math.round(rnd() * 2000), category_id: cat("Transporte y combustible") });
  if (rnd() > 0.93) rows.push({ spent_on: iso(d), merchant: "Farmacia", amount_cents: 800 + Math.round(rnd() * 1500), category_id: cat("Salud y deporte") });
  if (rnd() > 0.95) rows.push({ spent_on: iso(d), merchant: "Druni", amount_cents: 900 + Math.round(rnd() * 1200), category_id: cat("Higiene personal") });
}
await db.from("expenses").insert(rows);
await db.from("budgets").insert({ period: "month", amount_cents: 70000 });
const { data: goal } = await db.from("savings_goals").select("id").eq("kind", "monthly").single();
await db.from("savings_movements").insert({ goal_id: goal.id, occurred_on: iso(today), kind: "deposit", amount_cents: 2200, concept: "Hucha" });
const { data: me } = await db.from("members").select("id").single();
await db.from("workout_series").insert({ member_id: me.id, activity: "Pilates", weekday: ((today.getDay() + 6) % 7) + 1, start_time: "19:00", duration_min: 55, starts_on: iso(today) });
await db.from("workouts").insert({ member_id: me.id, activity: "Correr", session_date: iso(today), status: "realizado", duration_min: 40 });
await db.from("tasks").insert([{ title: "Preparar el menú semanal", due_date: iso(today), recurrence: "weekly" }, { title: "Revisar la nevera", due_date: iso(today), priority: "alta" }]);
await db.from("meal_plan").insert([{ plan_date: iso(today), meal: "comida", title: "Lentejas con verduras" }, { plan_date: iso(today), meal: "cena", title: "Tortilla de patatas" }]);
await db.from("shopping_items").insert((await db.from("shopping_lists").select("id").single()).data ? [{ list_id: (await db.from("shopping_lists").select("id").single()).data.id, name: "leche", quantity: 2, unit: "l" }, { list_id: (await db.from("shopping_lists").select("id").single()).data.id, name: "pan" }] : []);

const browser = await chromium.launch();
for (const [name, opts] of [["escritorio", { viewport: { width: 1440, height: 900 } }], ["movil", devices["iPhone 13"]]]) {
  const ctx = await browser.newContext({ ...opts, locale: "es-ES", timezoneId: "Europe/Madrid" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.locator("form").getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(BASE + "/");
  for (const [file, path] of [["inicio", "/"], ["gastos", "/gastos"], ["ahorro", "/ahorro"], ["compras", "/compras"], ["ajustes", "/mas"]]) {
    await page.goto(BASE + path);
    await page.waitForTimeout(1800); // deja terminar las animaciones
    await page.screenshot({ path: `${OUT}/${name}-${file}.png`, fullPage: name === "movil" ? false : true });
  }
  // Tooltip del gráfico y estado de carga
  if (name === "escritorio") {
    await page.goto(BASE + "/");
    await page.waitForTimeout(1800);
    const chart = page.locator(".h-44").first();
    const box = await chart.boundingBox();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${name}-tooltip.png`, clip: { x: box.x - 30, y: box.y - 120, width: box.width + 60, height: box.height + 160 } });
  }
  await ctx.close();
}
await browser.close();
console.log("Capturas en", OUT);
