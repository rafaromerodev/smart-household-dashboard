"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/supabase/server";
import { type ActionResult, OK, dbError, fail, parseForm, zOptDate, zOptText, zOptUuid, zText } from "@/lib/actions";
import { nextDueDate, type Recurrence } from "@/lib/domain/recurrence";
import { todayISO } from "@/lib/domain/dates";

const done = () => { revalidatePath("/", "layout"); return OK; };

const TaskSchema = z.object({
  titulo: zText(140),
  descripcion: zOptText(2000),
  responsable: zOptUuid,
  fecha: zOptDate,
  prioridad: z.enum(["baja", "media", "alta"]).default("media"),
  estado: z.enum(["pendiente", "en_curso", "hecha"]).default("pendiente"),
  categoria: zOptText(40),
  repeticion: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
});

function row(d: z.infer<typeof TaskSchema>) {
  return {
    title: d.titulo, description: d.descripcion, assignee_id: d.responsable, due_date: d.fecha,
    priority: d.prioridad, status: d.estado, category: d.categoria, recurrence: d.repeticion,
  };
}

export async function createTask(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(TaskSchema, fd);
  if ("error" in p) return fail(p.error);
  if (p.data.repeticion !== "none" && !p.data.fecha) return fail("Las tareas que se repiten necesitan fecha");
  const { supabase } = await requireMember();
  const { error } = await supabase.from("tasks").insert(row(p.data));
  return error ? dbError(error) : done();
}

export async function updateTask(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(TaskSchema, fd);
  if ("error" in p) return fail(p.error);
  const { supabase } = await requireMember();
  const { error } = await supabase.from("tasks").update(row(p.data)).eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect("/tareas");
}

/** Completa (o reabre) una tarea. Si es recurrente, crea la siguiente aparición. */
export async function setTaskDone(id: string, isDone: boolean): Promise<ActionResult> {
  const { supabase, me, household } = await requireMember();
  const { data: t } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (!t) return fail("Tarea no encontrada");
  const { error } = await supabase.from("tasks").update({
    status: isDone ? "hecha" : "pendiente",
    completed_at: isDone ? new Date().toISOString() : null,
    completed_by: isDone ? me.id : null,
  }).eq("id", id);
  if (error) return dbError(error);

  if (isDone && t.status !== "hecha" && t.recurrence !== "none") {
    const next = nextDueDate(t.due_date, t.recurrence as Recurrence, todayISO(household.timezone));
    const { error: e2 } = await supabase.from("tasks").insert({
      title: t.title, description: t.description, assignee_id: t.assignee_id, due_date: next,
      priority: t.priority, category: t.category, recurrence: t.recurrence,
    });
    if (e2) return dbError(e2);
    // La tarea completada deja de repetirse: la nueva lleva la recurrencia.
    await supabase.from("tasks").update({ recurrence: "none" }).eq("id", id);
  }
  return done();
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return OK;
}
