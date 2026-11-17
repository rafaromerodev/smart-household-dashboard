"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/supabase/server";
import { type ActionResult, OK, dbError, fail, parseForm, zDate, zEuros, zOptText, zOptUuid, zText, zUuid, zOptDate } from "@/lib/actions";
import { parseEurosToCents } from "@/lib/domain/money";
import { balance, validateWithdrawal } from "@/lib/domain/savings";

const MovementSchema = z.object({
  tipo: z.enum(["deposit", "withdrawal"]),
  objetivo: zUuid,
  fecha: zDate,
  importe: zEuros,
  concepto: zOptText(140),
  motivo: zOptText(280),
  persona: zOptUuid,
});

async function checkAndBuild(fd: FormData, excludeId?: string) {
  const p = parseForm(MovementSchema, fd);
  if ("error" in p) return { error: p.error };
  const d = p.data;
  const ctx = await requireMember();
  if (d.tipo === "withdrawal") {
    let q = ctx.supabase.from("savings_movements").select("occurred_on,kind,amount_cents").eq("goal_id", d.objetivo);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q;
    const err = validateWithdrawal(balance((data ?? []) as never), d.importe, d.motivo);
    if (err) return { error: err };
  }
  return {
    ctx,
    row: {
      kind: d.tipo, goal_id: d.objetivo, occurred_on: d.fecha, amount_cents: d.importe,
      concept: d.concepto, reason: d.tipo === "withdrawal" ? d.motivo : null, member_id: d.persona ?? ctx.me.id,
    },
  };
}

export async function createMovement(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const b = await checkAndBuild(fd);
  if (!b.ctx) return fail(b.error!);
  const { error } = await b.ctx.supabase.from("savings_movements").insert(b.row);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}

export async function updateMovement(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const b = await checkAndBuild(fd, id);
  if (!b.ctx) return fail(b.error!);
  const { error } = await b.ctx.supabase.from("savings_movements").update(b.row).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect("/ahorro");
}

export async function deleteMovement(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("savings_movements").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}

// Meta mensual: se guarda con fecha de inicio para no alterar meses anteriores.
const TargetSchema = z.object({
  objetivo: zUuid,
  desde: z.string().regex(/^\d{4}-\d{2}$/, "Mes no válido"),
  minimo: zEuros,
  maximo: z.string().optional(),
});

export async function setMonthlyTarget(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(TargetSchema, fd);
  if ("error" in p) return fail(p.error);
  const max = p.data.maximo?.trim() ? parseEurosToCents(p.data.maximo) : p.data.minimo;
  if (max == null || max < p.data.minimo) return fail("El máximo debe ser mayor o igual que el mínimo");
  const { supabase, household } = await requireMember();
  const { error } = await supabase.from("savings_monthly_targets").upsert(
    { household_id: household.id, goal_id: p.data.objetivo, valid_from: p.data.desde + "-01", min_cents: p.data.minimo, max_cents: max },
    { onConflict: "goal_id,valid_from" },
  );
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}

const GoalSchema = z.object({ nombre: zText(80), meta: zEuros, fecha: zOptDate });

export async function createGoal(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(GoalSchema, fd);
  if ("error" in p) return fail(p.error);
  const { supabase } = await requireMember();
  const { error } = await supabase.from("savings_goals").insert({ name: p.data.nombre, kind: "target", target_cents: p.data.meta, target_date: p.data.fecha });
  if (error) return dbError(error);
  revalidatePath("/ahorro");
  return OK;
}

export async function archiveGoal(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("savings_goals").update({ archived: true }).eq("id", id).eq("kind", "target");
  if (error) return dbError(error);
  revalidatePath("/ahorro");
  return OK;
}
