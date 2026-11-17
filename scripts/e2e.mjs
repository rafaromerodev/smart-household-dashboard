// Prueba E2E en navegador real (Chromium con viewport de iPhone) contra la app + Supabase local.
// Recorre los flujos principales haciendo clic como lo haría una persona.
// Uso: node scripts/e2e.mjs http://localhost:3100 [carpeta-capturas]
import { chromium, devices } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = process.argv[3];
const email = `e2e-${Date.now().toString(36)}@test.local`;

const browser = await chromium.launch();
// DESKTOP=1 → ventana de escritorio (1280×860) en lugar de iPhone
const viewport = process.env.DESKTOP ? { viewport: { width: 1280, height: 860 } } : devices["iPhone 13"];
const ctx = await browser.newContext({ ...viewport, locale: "es-ES", timezoneId: "Europe/Madrid" });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

let step = 0;
const ok = (msg) => console.log(`OK  ${++step}. ${msg}`);
const dialog = () => page.locator("dialog[open]");
const expectText = async (text, where = page) => {
  await where.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
};

try {
  // 1-2 Registro y alta del hogar
  await page.goto(BASE + "/login");
  await page.getByRole("button", { name: "Crear cuenta" }).first().click();
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", "contraseña-segura-1");
  await page.locator("form").getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL("**/bienvenida");
  ok("registro de cuenta");
  await page.fill("input[name=nombre]", "Ana");
  await page.getByRole("button", { name: "Crear hogar" }).last().click();
  await page.waitForURL(BASE + "/");
  await page.locator("h1", { hasText: ", Ana" }).waitFor({ timeout: 8000 });
  ok("alta del hogar y llegada al inicio");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/01-inicio-vacio.png`, fullPage: true });

  // 3 Gasto desde el acceso rápido
  await page.getByRole("link", { name: "Gasto", exact: true }).click();
  await dialog().waitFor();
  await dialog().locator("input[name=importe]").fill("45,60");
  await dialog().locator("input[name=establecimiento]").fill("Mercadona");
  const opt = await dialog().locator("select[name=categoria] option", { hasText: "Supermercado" }).getAttribute("value");
  await dialog().locator("select[name=categoria]").selectOption(opt);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/02-nuevo-gasto.png` });
  await dialog().getByRole("button", { name: "Añadir gasto" }).click();
  await dialog().waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  await page.locator("dialog[open]").waitFor({ state: "hidden", timeout: 8000 });
  await expectText("45,60");
  ok("añadir gasto (acceso rápido → hoja → guardar)");

  // 4 Control de duplicados
  await page.getByRole("button", { name: "Gasto" }).first().click();
  await dialog().locator("input[name=importe]").fill("45,60");
  await dialog().locator("input[name=establecimiento]").fill("mercadona");
  await dialog().getByRole("button", { name: "Añadir gasto" }).click();
  await expectText("Ya hay un gasto", dialog());
  await dialog().locator("input[name=confirmado]").check();
  await dialog().getByRole("button", { name: "Añadir gasto" }).click();
  await page.locator("dialog[open]").waitFor({ state: "hidden", timeout: 8000 });
  await page.waitForFunction(() => document.querySelectorAll('a[href^="/gastos/"][href*="-"]').length === 2);
  ok("aviso de posible duplicado y confirmación explícita");

  // 5 Editar y eliminar
  await page.locator('a[href^="/gastos/"][href*="-"]').first().click();
  await page.waitForURL("**/gastos/*-*");
  await page.fill("input[name=importe]", "50");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForURL("**/gastos");
  await expectText("50,00");
  ok("editar gasto");
  await page.locator('a[href^="/gastos/"][href*="-"]').first().click();
  await page.getByRole("button", { name: "Eliminar" }).click();
  await page.waitForURL("**/gastos", { timeout: 8000 }).catch(() => {});
  await page.goto(BASE + "/gastos");
  const left = await page.locator('a[href^="/gastos/"][href*="-"]').count();
  if (left !== 1) throw new Error(`Tras eliminar quedan ${left} gastos`);
  ok("eliminar gasto");

  // 6 Lista de la compra
  await page.goto(BASE + "/compras?nuevo=producto");
  await page.fill("input[name=texto]", "2 l leche");
  await page.keyboard.press("Enter");
  await expectText("leche");
  await expectText("2 l");
  await page.getByRole("button", { name: "Marcar como comprado" }).first().click();
  await expectText("En el carro");
  ok("añadir producto y marcarlo como comprado");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/03-lista.png` });

  // 7 Ahorro
  await page.goto(BASE + "/ahorro?nuevo=aportacion");
  await dialog().waitFor();
  await dialog().locator("input[name=importe]").fill("25");
  await dialog().getByRole("button", { name: "Registrar aportación" }).click();
  await page.locator("dialog[open]").waitFor({ state: "hidden", timeout: 8000 });
  await expectText("Mínimo alcanzado");
  await page.getByRole("button", { name: "Retirar" }).click();
  await dialog().locator("input[name=importe]").fill("100");
  await dialog().locator("input[name=motivo]").fill("Prueba");
  await dialog().getByRole("button", { name: "Registrar retirada" }).click();
  await expectText("No hay saldo suficiente", dialog());
  await dialog().locator("input[name=importe]").fill("5");
  await dialog().getByRole("button", { name: "Registrar retirada" }).click();
  await page.locator("dialog[open]").waitFor({ state: "hidden", timeout: 8000 });
  await expectText("Retirada: Prueba");
  ok("aportación, retirada sin saldo rechazada y retirada válida");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/04-ahorro.png`, fullPage: true });

  // 8 Tareas recurrentes
  await page.goto(BASE + "/tareas?nuevo=tarea");
  await dialog().getByRole("button", { name: "Hacer la compra" }).click();
  await dialog().getByRole("button", { name: "Crear tarea" }).click();
  await page.locator("dialog[open]").waitFor({ state: "hidden", timeout: 8000 });
  await expectText("Hacer la compra");
  await page.getByRole("button", { name: "Completar" }).first().click();
  await expectText("Próximos 7 días");
  ok("crear tarea desde plantilla y completarla (se genera la siguiente)");

  // 9 Entrenamientos
  await page.goto(BASE + "/entrenamientos?nuevo=entreno");
  await dialog().locator("input[name=actividad]").fill("Spinning");
  await dialog().locator("input[name=hora]").fill("19:00");
  await dialog().locator("input[name=repetir]").check();
  await dialog().getByRole("button", { name: "Crear clase semanal" }).click();
  await page.locator("dialog[open]").waitFor({ state: "hidden", timeout: 8000 });
  await expectText("Clases semanales");
  await page.getByRole("button", { name: "Marcar realizado" }).first().click();
  await expectText("Hecho");
  ok("clase semanal recurrente y marcar sesión realizada");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/05-entrenos.png`, fullPage: true });

  // 10 Inicio con datos (claro y oscuro)
  await page.goto(BASE + "/");
  await expectText("45,60"); // el gasto que queda tras editar y borrar el otro
  await expectText("20,00"); // ahorro neto: 25 € − 5 €
  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/06-inicio.png`, fullPage: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: `${SHOTS}/07-inicio-oscuro.png`, fullPage: true });
  }
  ok("inicio refleja los datos registrados");

  if (errors.length) throw new Error("Errores de JavaScript en la página: " + errors.join(" | "));
  console.log("\nE2E completado sin errores");
} catch (e) {
  console.error(`ERR en el paso ${step + 1}:`, e.message);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/error.png`, fullPage: true });
  process.exitCode = 1;
} finally {
  await browser.close();
}
