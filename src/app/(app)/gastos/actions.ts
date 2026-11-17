"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/supabase/server";
import {
  type ActionResult, OK, dbError, fail, parseForm,
  zDate, zEuros, zOptText, zOptUuid, zText, zUuid,
} from "@/lib/actions";
import { parseEurosToCents } from "@/lib/domain/money";
import { findPossibleDuplicates } from "@/lib/domain/receipt";

const ExpenseSchema = z.object({
  fecha: zDate,
  importe: zEuros,
  establecimiento: zText(120),
  categoria: zOptUuid,
  ambito: z.enum(["shared", "personal"]),
  persona: zOptUuid,
  medio_pago: zOptText(40),
  descuento: zOptText(20),
  notas: zOptText(1000),
  justificante: zOptUuid,
  confirmado: z.string().optional(),
});

async function buildRow(fd: FormData) {
  const p = parseForm(ExpenseSchema, fd);
  if ("error" in p) return { error: p.error } as const;
  const d = p.data;
  const ctx = await requireMember();
  const discount = d.descuento ? parseEurosToCents(d.descuento) : 0;
  if (discount == null || discount < 0) return { error: "Descuento no válido" } as const;

  // Si el establecimiento coincide con uno configurado, se enlaza (sirve para "gasto en supermercados").
  const { data: stores } = await ctx.supabase.from("stores").select("id,name");
  const store = stores?.find((s) => s.name.toLowerCase() === d.establecimiento.toLowerCase());

  return {
    ctx,
    confirmed: d.confirmado === "1",
    row: {
      spent_on: d.fecha,
      amount_cents: d.importe,
      merchant: store?.name ?? d.establecimiento,
      store_id: store?.id ?? null,
      category_id: d.categoria,
      scope: d.ambito,
      member_id: d.persona ?? ctx.me.id,
      payment_method: d.medio_pago,
      discount_cents: discount,
      notes: d.notas,
      receipt_id: d.justificante,
    },
  } as const;
}

export async function createExpense(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const b = await buildRow(fd);
  if ("error" in b) return fail(b.error!);
  const { ctx, row, confirmed } = b;

  if (!confirmed) {
    const { data: same } = await ctx.supabase
      .from("expenses").select("merchant,spent_on,amount_cents")
      .eq("spent_on", row.spent_on).eq("amount_cents", row.amount_cents);
    if (findPossibleDuplicates(row, same ?? []).length)
      return { ok: false, needsConfirm: "Ya hay un gasto con el mismo establecimiento, fecha e importe. Marca esta casilla y vuelve a guardar si es un gasto distinto." };
  }

  const { error } = await ctx.supabase.from("expenses").insert(row);
  if (error) return dbError(error);
  if (row.receipt_id) await ctx.supabase.from("receipts").update({ status: "revisado" }).eq("id", row.receipt_id);
  revalidatePath("/", "layout");
  return OK;
}

export async function updateExpense(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  if (!zUuid.safeParse(id).success) return fail("Gasto no válido");
  const b = await buildRow(fd);
  if ("error" in b) return fail(b.error!);
  const { error } = await b.ctx.supabase.from("expenses").update(b.row).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect("/gastos");
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { data: exp } = await supabase.from("expenses").select("receipt_id").eq("id", id).single();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return dbError(error);
  // El justificante se borra también si ningún otro gasto lo usa.
  if (exp?.receipt_id) {
    const { count } = await supabase.from("expenses").select("id", { count: "exact", head: true }).eq("receipt_id", exp.receipt_id);
    if (!count) {
      const { data: r } = await supabase.from("receipts").select("storage_path").eq("id", exp.receipt_id).single();
      if (r) await supabase.storage.from("receipts").remove([r.storage_path]);
      await supabase.from("receipts").delete().eq("id", exp.receipt_id);
    }
  }
  revalidatePath("/", "layout");
  return OK;
}

// ---------------------------------------------------------------- categorías

const CategorySchema = z.object({
  nombre: zText(60),
  padre: zOptUuid,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#94a3b8"),
});

export async function createCategory(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(CategorySchema, fd);
  if ("error" in p) return fail(p.error);
  const { supabase } = await requireMember();
  const { error } = await supabase.from("categories").insert({ name: p.data.nombre, parent_id: p.data.padre, color: p.data.color });
  if (error) return dbError(error);
  revalidatePath("/gastos", "layout");
  return OK;
}

export async function renameCategory(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(CategorySchema.pick({ nombre: true, color: true }), fd);
  if ("error" in p) return fail(p.error);
  const { supabase } = await requireMember();
  const { error } = await supabase.from("categories").update({ name: p.data.nombre, color: p.data.color }).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/gastos", "layout");
  return OK;
}

export async function toggleArchiveCategory(id: string, archived: boolean): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("categories").update({ archived }).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/gastos", "layout");
  return OK;
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { count } = await supabase.from("expenses").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) return fail(`Tiene ${count} gasto(s) asociados: archívala en lugar de borrarla`);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/gastos", "layout");
  return OK;
}

// ---------------------------------------------------------------- presupuestos

const BudgetSchema = z.object({
  categoria: zOptUuid,
  periodo: z.enum(["week", "month"]),
  importe: zEuros,
});

export async function upsertBudget(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(BudgetSchema, fd);
  if ("error" in p) return fail(p.error);
  const { supabase, household } = await requireMember();
  const { error } = await supabase.from("budgets").upsert(
    { household_id: household.id, category_id: p.data.categoria, period: p.data.periodo, amount_cents: p.data.importe },
    { onConflict: "household_id,category_id,period" },
  );
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}
