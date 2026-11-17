// Prueba de humo: crea un usuario de prueba en el Supabase LOCAL, inicia sesión
// y recorre todas las pantallas comprobando que se renderizan sin errores.
// Uso: node scripts/smoke.mjs http://localhost:3100
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3000";
const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const db = createClient(URL, ANON, { auth: { persistSession: false } });
const email = `smoke-${Date.now().toString(36)}@test.local`;
const { data, error } = await db.auth.signUp({ email, password: "contraseña-segura-1" });
if (error) throw error;

// Cookie con el formato de @supabase/ssr: sb-<ref>-auth-token = "base64-" + base64url(JSON), troceada a 3180 caracteres
const value = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64url");
const name = "sb-127-auth-token";
const chunks = value.match(/.{1,3180}/g);
const cookie = chunks.length === 1 ? `${name}=${value}` : chunks.map((c, i) => `${name}.${i}=${c}`).join("; ");

const get = (p) => fetch(BASE + p, { headers: { cookie }, redirect: "manual" });

let fails = 0;
const check = async (p, expect = 200, must) => {
  const r = await get(p);
  const body = r.status === 200 ? await r.text() : "";
  const okStatus = r.status === expect;
  const okBody = !must || body.includes(must);
  const crashed = body.includes("Application error") || body.includes("Internal Server Error");
  const ok = okStatus && okBody && !crashed;
  if (!ok) fails++;
  console.log(`${ok ? "OK " : "ERR"} ${r.status} ${p}${!okBody ? ` (falta «${must}»)` : ""}${r.headers.get("location") ? " → " + r.headers.get("location") : ""}`);
};

// Sin hogar todavía → bienvenida
await check("/", 307);
await check("/bienvenida", 200, "Crear hogar");
const { error: e2 } = await db.rpc("create_household", { p_name: "Casa smoke", p_display_name: "Smoke" });
if (e2) throw e2;

// Algunos datos reales para que las pantallas muestren contenido
const { data: goal } = await db.from("savings_goals").select("id").eq("kind", "monthly").single();
const { data: store } = await db.from("stores").select("id").eq("name", "Carrefour").single();
const { data: me } = await db.from("members").select("id").single();
const today = new Date().toISOString().slice(0, 10);
await db.from("expenses").insert({ spent_on: today, merchant: "Carrefour", store_id: store.id, amount_cents: 5432 });
await db.from("savings_movements").insert({ goal_id: goal.id, occurred_on: today, kind: "deposit", amount_cents: 2500, concept: "Hucha" });
await db.from("budgets").insert({ period: "month", amount_cents: 60000 });
const { data: rec } = await db.from("recipes").insert({ name: "Tortilla", servings: 4 }).select("id").single();
await db.from("recipe_ingredients").insert([{ recipe_id: rec.id, name: "Huevos", quantity: 6, unit: "ud" }, { recipe_id: rec.id, name: "Patata", quantity: 0.5, unit: "kg" }]);
await db.from("meal_plan").insert({ plan_date: today, meal: "cena", recipe_id: rec.id, title: "Tortilla" });
await db.from("workout_series").insert({ member_id: me.id, activity: "Pilates", weekday: ((new Date().getDay() + 6) % 7) + 1, start_time: "19:00", duration_min: 55, starts_on: today });
await db.from("tasks").insert({ title: "Preparar el menú semanal", due_date: today, recurrence: "weekly" });
await db.from("inventory_items").insert({ name: "Yogures", quantity: 4, unit: "ud", location: "nevera", expires_on: today });

await check("/", 200, "Smoke</h1>");
await check("/", 200, "54,32");                 // gasto del mes
await check("/", 200, "Caduca pronto: Yogures"); // alerta de despensa
await check("/ahorro", 200, "Mínimo alcanzado"); // 25 € frente a meta 20–30 €
await check("/?p=week", 200, "esta semana");
await check("/?p=year", 200, "este año");
await check(`/?p=custom&desde=${today.slice(0, 8)}01&hasta=${today}`, 200, "en el rango");
await check("/gastos", 200, "Carrefour");
await check("/gastos/categorias", 200, "Higiene personal");
await check("/gastos/presupuestos", 200, "Mensual");
await check("/ahorro", 200, "Saldo disponible");
await check("/compras", 200, "Compras");
await check("/compras/menu", 200, "Huevos");
await check("/compras/recetas", 200, "Tortilla");
await check(`/compras/recetas/${rec.id}`, 200, "Tortilla");
await check("/compras/despensa", 200, "Yogures");
await check("/entrenamientos", 200, "Pilates");
await check("/entrenamientos?vista=mes", 200, "Pilates");
await check("/tareas", 200, "Preparar el menú semanal");
await check("/calendario", 200, "Pilates");
await check("/mas", 200, "Invita a tu pareja");
await check("/manifest.webmanifest", 200, "standalone");
await check("/icons/192", 200);
await check("/apple-icon", 200);
await check("/sw.js", 200, "OFFLINE_URL");
await check("/offline", 200, "Sin conexión");

// Sin sesión → login
const anon = await fetch(BASE + "/gastos", { redirect: "manual" });
console.log(`${anon.status === 307 ? "OK " : "ERR"} ${anon.status} /gastos sin sesión → ${anon.headers.get("location")}`);
if (anon.status !== 307) fails++;

console.log(fails ? `\n${fails} comprobación(es) fallida(s)` : "\nTodas las pantallas responden correctamente");
process.exit(fails ? 1 : 0);
