import "server-only";
import type { createClient } from "./supabase/server";
import { mergeSessions } from "./domain/recurrence";
import type { Range } from "./domain/dates";

type DB = Awaited<ReturnType<typeof createClient>>;

export interface Session {
  key: string;
  id: string | null;          // null = ocurrencia virtual de una serie
  series_id: string | null;
  member_id: string;
  activity: string;
  date: string;
  start_time: string | null;
  duration_min: number | null;
  location: string | null;
  status: "planificado" | "realizado" | "cancelado";
  notes: string | null;
}

/** Sesiones de entrenamiento de un rango: las guardadas + las de clases recurrentes aún no marcadas. */
export async function loadSessions(db: DB, r: Range): Promise<Session[]> {
  const [{ data: stored }, { data: series }] = await Promise.all([
    db.from("workouts").select("*").gte("session_date", r.from).lte("session_date", r.to),
    db.from("workout_series").select("*").lte("starts_on", r.to).or(`ends_on.is.null,ends_on.gte.${r.from}`),
  ]);
  const m = mergeSessions(series ?? [], stored ?? [], r);
  const out: Session[] = [
    ...m.stored.map((w) => ({
      key: w.id, id: w.id, series_id: w.series_id, member_id: w.member_id, activity: w.activity, date: w.session_date,
      start_time: w.start_time?.slice(0, 5) ?? null, duration_min: w.duration_min, location: w.location,
      status: w.status as Session["status"], notes: w.notes,
    })),
    ...m.virtual.map(({ series: s, date }) => ({
      key: `${s.id}|${date}`, id: null, series_id: s.id, member_id: s.member_id, activity: s.activity, date,
      start_time: s.start_time.slice(0, 5), duration_min: s.duration_min, location: s.location,
      status: "planificado" as const, notes: null,
    })),
  ];
  return out.sort((a, b) => (a.date + (a.start_time ?? "99")).localeCompare(b.date + (b.start_time ?? "99")));
}
