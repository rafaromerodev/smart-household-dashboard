/**
 * Prueba de integración contra el Supabase LOCAL (`npm run db:start`).
 * Comprueba seguridad (RLS por hogar), invitación, límites e integridad.
 * Se omite automáticamente si la base de datos local no está arrancada.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "../../src/lib/supabase/database.types";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const up = await fetch(`${URL}/auth/v1/health`, { headers: { apikey: ANON } }).then((r) => r.ok).catch(() => false);
const run = Date.now().toString(36);

async function user(name: string): Promise<SupabaseClient<Database>> {
  const c = createClient<Database>(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signUp({ email: `${name}-${run}@test.local`, password: "contraseña-segura-1" });
  if (error) throw error;
  return c;
}

describe.skipIf(!up)("base de datos (Supabase local)", () => {
  let a: SupabaseClient<Database>, r: SupabaseClient<Database>, x: SupabaseClient<Database>, y: SupabaseClient<Database>;
  let code = "";

  beforeAll(async () => {
    [a, r, x, y] = await Promise.all([user("a"), user("r"), user("x"), user("y")]);
    const h = await a.rpc("create_household", { p_name: "Casa de prueba", p_display_name: "A" });
    expect(h.error).toBeNull();
    code = (await a.from("households").select("invite_code").single()).data!.invite_code;
    expect((await r.rpc("join_household", { p_code: code.toLowerCase(), p_display_name: "R" })).error).toBeNull();
    expect((await x.rpc("create_household", { p_name: "Otra casa", p_display_name: "X" })).error).toBeNull();
  });

  it("crea categorías, tiendas (sin descuentos configurados) y meta 20–30 €", async () => {
    const cats = await a.from("categories").select("name,parent_id");
    expect(cats.data!.filter((c) => !c.parent_id).map((c) => c.name)).toContain("Higiene personal");
    const stores = await a.from("stores").select("name,employee_discount_pct,discount_confirmed").order("name");
    expect(stores.data).toEqual([
      { name: "Carrefour", employee_discount_pct: 0, discount_confirmed: false },
      { name: "Mercadona", employee_discount_pct: 0, discount_confirmed: false },
    ]);
    const t = await a.from("savings_monthly_targets").select("min_cents,max_cents").single();
    expect(t.data).toEqual({ min_cents: 2000, max_cents: 3000 });
  });

  it("los dos miembros comparten datos; otro hogar no ve nada", async () => {
    const ins = await a.from("expenses").insert({ spent_on: "2026-11-09", merchant: "Mercadona", amount_cents: 4560 }).select("id").single();
    expect(ins.error).toBeNull();
    expect((await r.from("expenses").select("id").eq("id", ins.data!.id)).data).toHaveLength(1);
    expect((await x.from("expenses").select("id").eq("id", ins.data!.id)).data).toHaveLength(0);
    // ni puede modificar ni borrar
    await x.from("expenses").update({ amount_cents: 1 }).eq("id", ins.data!.id);
    await x.from("expenses").delete().eq("id", ins.data!.id);
    expect((await a.from("expenses").select("amount_cents").eq("id", ins.data!.id).single()).data!.amount_cents).toBe(4560);
    // ni insertar en el hogar ajeno indicando su id
    const hidA = (await a.from("households").select("id").single()).data!.id;
    const bad = await x.from("expenses").insert({ household_id: hidA, spent_on: "2026-11-09", merchant: "Hack", amount_cents: 100 });
    expect(bad.error).not.toBeNull();
    expect((await x.from("members").select("id")).data).toHaveLength(1);
  });

  it("máximo dos miembros por hogar y un usuario solo en un hogar", async () => {
    const third = await y.rpc("join_household", { p_code: code, p_display_name: "Y" });
    expect(third.error?.message).toMatch(/dos miembros/);
    const again = await r.rpc("create_household", { p_name: "Otra", p_display_name: "R" });
    expect(again.error?.message).toMatch(/Ya perteneces/);
  });

  it("las líneas de un ticket deben sumar el total (sin duplicar importes)", async () => {
    const e = await a.from("expenses").insert({ spent_on: "2026-11-08", merchant: "Carrefour", amount_cents: 2100 }).select("id").single();
    const ok = await a.from("expense_lines").insert([
      { expense_id: e.data!.id, description: "Comida", amount_cents: 881 },
      { expense_id: e.data!.id, description: "Champú", amount_cents: 320 },
      { expense_id: e.data!.id, description: "Detergente", amount_cents: 899 },
    ]);
    expect(ok.error).toBeNull();
    const bad = await a.from("expense_lines").insert({ expense_id: e.data!.id, description: "Extra", amount_cents: 50 });
    expect(bad.error?.message).toMatch(/no coincide/);
  });

  it("una retirada de ahorro exige motivo; el ahorro no es un gasto", async () => {
    const goal = (await a.from("savings_goals").select("id").eq("kind", "monthly").single()).data!.id;
    const before = (await a.from("expenses").select("id")).data!.length;
    expect((await a.from("savings_movements").insert({ goal_id: goal, occurred_on: "2026-11-09", kind: "deposit", amount_cents: 2500 })).error).toBeNull();
    expect((await a.from("savings_movements").insert({ goal_id: goal, occurred_on: "2026-11-09", kind: "withdrawal", amount_cents: 500 })).error).not.toBeNull();
    expect((await a.from("savings_movements").insert({ goal_id: goal, occurred_on: "2026-11-09", kind: "withdrawal", amount_cents: 500, reason: "Regalo" })).error).toBeNull();
    expect((await a.from("expenses").select("id")).data!.length).toBe(before);
  });

  it("justificantes: bucket privado por hogar y sin duplicados", async () => {
    const hid = (await a.from("households").select("id").single()).data!.id;
    const path = `${hid}/prueba-${run}.pdf`;
    const upA = await a.storage.from("receipts").upload(path, new Blob(["%PDF-1.4 prueba"], { type: "application/pdf" }), { contentType: "application/pdf" });
    expect(upA.error).toBeNull();
    expect((await r.storage.from("receipts").download(path)).error).toBeNull();
    expect((await x.storage.from("receipts").download(path)).data).toBeNull();
    const xHid = (await x.from("households").select("id").single()).data!.id;
    expect((await x.storage.from("receipts").upload(`${hid}/intruso.pdf`, new Blob(["x"]), { contentType: "application/pdf" })).error).not.toBeNull();
    expect(xHid).not.toBe(hid);
    const rec = { storage_path: path, mime_type: "application/pdf", size_bytes: 15, sha256: `hash-${run}` };
    expect((await a.from("receipts").insert(rec)).error).toBeNull();
    expect((await r.from("receipts").insert(rec)).error?.code).toBe("23505");
  });
});
