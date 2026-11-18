// Capturas de diseño: crea una cuenta de PRUEBA en el Supabase LOCAL con datos de ejemplo
// (solo para revisar el aspecto de gráficos y tarjetas; nunca se usa en producción)
// y fotografía las pantallas principales en escritorio y móvil.
// Uso: node scripts/capturas.mjs http://localhost:3210 <carpeta>
import { createClient } from "@supabase/supabase-js";
import { chromium, devices } from "playwright";
import { seedHouseholdData } from "./lib/demo-data.mjs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? ".";
const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const email = `capturas-${Date.now().toString(36)}@test.local`;
const password = "contraseña-segura-1";

const db = createClient(URL, ANON, { auth: { persistSession: false } });
await db.auth.signUp({ email, password });
await db.rpc("create_household", { p_name: "Casa de prueba", p_display_name: "Ana" });

const { data: me } = await db.from("members").select("id").single();
await seedHouseholdData(db, { members: { main: me.id } });

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
