"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/supabase/server";
import { type ActionResult, OK, dbError, fail, parseForm, zDate, zOptText, zText, zUuid } from "@/lib/actions";
import { isoWeekday } from "@/lib/domain/dates";

const done = () => { revalidatePath("/", "layout"); return OK; };
const zTime = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().regex(/^\d{2}:\d{2}$/).nullable());

const WorkoutSchema = z.object({
  persona: zUuid,
  actividad: zText(80),
  fecha: zDate,
  hora: zTime,
  duracion: z.coerce.number().int().min(5).max(600).default(60),
  lugar: zOptText(80),
  estado: z.enum(["planificado", "realizado", "cancelado"]).default("planificado"),
  notas: zOptText(500),
  repetir: z.string().optional(),
  hasta: z.preprocess((v) => (v === "" || v === undefined ? null : v), zDate.nullable()),
});

export async function createWorkout(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(WorkoutSchema, fd);
  if ("error" in p) return fail(p.error);
  const d = p.data;
  const { supabase } = await requireMember();

  if (d.repetir === "on") {
    if (!d.hora) return fail("Las clases recurrentes necesitan hora de inicio");
    const { error } = await supabase.from("workout_series").insert({
      member_id: d.persona, activity: d.actividad, weekday: isoWeekday(d.fecha), start_time: d.hora,
      duration_min: d.duracion, location: d.lugar, starts_on: d.fecha, ends_on: d.hasta,
    });
    return error ? dbError(error) : done();
  }
  const { error } = await supabase.from("workouts").insert({
    member_id: d.persona, activity: d.actividad, session_date: d.fecha, start_time: d.hora,
    duration_min: d.duracion, location: d.lugar, status: d.estado, notes: d.notas,
  });
  return error ? dbError(error) : done();
}

const Status = z.enum(["planificado", "realizado", "cancelado"]);

export async function setWorkoutStatus(id: string, status: string): Promise<ActionResult> {
  const s = Status.safeParse(status);
  if (!s.success) return fail("Estado no válido");
  const { supabase } = await requireMember();
  const { error } = await supabase.from("workouts").update({ status: s.data }).eq("id", id);
  return error ? dbError(error) : done();
}

/** Marca una ocurrencia de una clase recurrente: la guarda como sesión real con ese estado. */
export async function setSeriesOccurrence(seriesId: string, date: string, status: string): Promise<ActionResult> {
  const s = Status.safeParse(status);
  if (!s.success || !zDate.safeParse(date).success) return fail("Datos no válidos");
  const { supabase } = await requireMember();
  const { data: series } = await supabase.from("workout_series").select("*").eq("id", seriesId).single();
  if (!series) return fail("Clase no encontrada");
  const { error } = await supabase.from("workouts").upsert({
    series_id: series.id, session_date: date, member_id: series.member_id, activity: series.activity,
    start_time: series.start_time, duration_min: series.duration_min, location: series.location, status: s.data,
  }, { onConflict: "series_id,session_date" });
  return error ? dbError(error) : done();
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  // Si viene de una serie, se marca cancelada en vez de borrar (si no, la ocurrencia reaparecería).
  const { data: w } = await supabase.from("workouts").select("series_id").eq("id", id).single();
  const { error } = w?.series_id
    ? await supabase.from("workouts").update({ status: "cancelado" }).eq("id", id)
    : await supabase.from("workouts").delete().eq("id", id);
  return error ? dbError(error) : done();
}

/** Termina una clase recurrente: deja de generarse desde mañana; el historial se conserva. */
export async function endSeries(id: string, today: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { data: s } = await supabase.from("workout_series").select("starts_on").eq("id", id).single();
  if (!s) return fail("Clase no encontrada");
  const { count } = await supabase.from("workouts").select("id", { count: "exact", head: true }).eq("series_id", id);
  const { error } = s.starts_on > today && !count
    ? await supabase.from("workout_series").delete().eq("id", id)
    : await supabase.from("workout_series").update({ ends_on: today < s.starts_on ? s.starts_on : today }).eq("id", id);
  return error ? dbError(error) : done();
}

export async function setWeeklyGoal(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ objetivo: z.coerce.number().int().min(0).max(21) }), fd);
  if ("error" in p) return fail(p.error);
  const { supabase, me } = await requireMember();
  const { error } = await supabase.from("members").update({ weekly_workout_goal: p.data.objetivo }).eq("id", me.id);
  return error ? dbError(error) : done();
}
