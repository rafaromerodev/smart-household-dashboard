"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/supabase/server";
import { type ActionResult, OK, dbError, fail, parseForm, zText } from "@/lib/actions";

export async function updateProfile(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ nombre: zText(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }), fd);
  if ("error" in p) return fail(p.error);
  const { supabase, me } = await requireMember();
  const { error } = await supabase.from("members").update({ display_name: p.data.nombre, color: p.data.color }).eq("id", me.id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}

export async function renameHousehold(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ hogar: zText(80) }), fd);
  if ("error" in p) return fail(p.error);
  const { supabase, household } = await requireMember();
  const { error } = await supabase.from("households").update({ name: p.data.hogar }).eq("id", household.id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}
