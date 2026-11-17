import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Dumbbell, Repeat, X, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { loadSessions, type Session } from "@/lib/schedule";
import { addDays, addMonths, endOfMonth, formatDay, formatMonth, isoWeekday, periodRange, startOfWeek, todayISO } from "@/lib/domain/dates";
import { ActionButton } from "@/components/forms";
import { Badge, Empty, PageHeader, Progress, Section } from "@/components/ui";
import { deleteWorkout, endSeries, setSeriesOccurrence, setWorkoutStatus } from "./actions";
import { GoalForm, NewWorkout } from "./workout-form";

export const metadata = { title: "Entrenamientos" };
const WD = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export default async function Entrenamientos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, me, members, household } = await requireMember();
  const today = todayISO(household.timezone);
  const view = sp.vista === "mes" ? "mes" : "semana";
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha! : today;
  const quien = sp.quien ?? "todos";
  const range = view === "mes" ? periodRange("month", ref) : periodRange("week", ref);
  const week = periodRange("week", today);
  const loadFrom = range.from < week.from ? range.from : week.from;
  const loadTo = range.to > week.to ? range.to : week.to;

  const [all, { data: series }, { data: acts }] = await Promise.all([
    loadSessions(supabase, { from: loadFrom, to: loadTo }),
    supabase.from("workout_series").select("*").or(`ends_on.is.null,ends_on.gte.${today}`).order("weekday"),
    supabase.from("workouts").select("activity").order("created_at", { ascending: false }).limit(100),
  ]);
  const activities = [...new Set([...(acts ?? []).map((a) => a.activity), ...(series ?? []).map((s) => s.activity)])];
  const filt = (s: Session) => quien === "todos" || s.member_id === quien;
  const sessions = all.filter((s) => s.date >= range.from && s.date <= range.to && filt(s));
  const memberById = new Map(members.map((m) => [m.id, m]));

  // Estadísticas del periodo visible
  const doneN = sessions.filter((s) => s.status === "realizado").length;
  const cancelled = sessions.filter((s) => s.status === "cancelado").length;
  const missed = sessions.filter((s) => s.status === "planificado" && s.date < today).length;
  const attendance = doneN + cancelled + missed > 0 ? doneN / (doneN + cancelled + missed) : null;

  const nav = (d: string) => `/entrenamientos?vista=${view}&fecha=${d}&quien=${quien}`;
  const prev = view === "mes" ? addMonths(range.from, -1) : addDays(range.from, -7);
  const next = view === "mes" ? addMonths(range.from, 1) : addDays(range.from, 7);
  const days = view === "semana" ? Array.from({ length: 7 }, (_, i) => addDays(range.from, i)) : [];

  return (
    <>
      <PageHeader title="Entrenamientos" action={
        <NewWorkout members={members.map((m) => ({ id: m.id, display_name: m.display_name }))} meId={me.id} today={today} activities={activities} />
      } />

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {members.map((m) => {
          const n = all.filter((s) => s.member_id === m.id && s.status === "realizado" && s.date >= week.from && s.date <= week.to).length;
          const goal = m.weekly_workout_goal;
          return (
            <div key={m.id} className="card py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium"><span className="size-2.5 rounded-full" style={{ background: m.color }} />{m.display_name}</span>
                <span className="text-muted">{n} / {goal} esta semana</span>
              </div>
              <Progress value={goal ? n / goal : 0} tone={goal && n >= goal ? "ok" : "accent"} label={`Sesiones de ${m.display_name}`} />
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(["semana", "mes"] as const).map((v) => (
            <Link key={v} href={`/entrenamientos?vista=${v}&fecha=${ref}&quien=${quien}`} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === v ? "bg-surface-strong shadow-sm" : "text-muted"}`}>{v}</Link>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <Link href={`/entrenamientos?vista=${view}&fecha=${ref}&quien=todos`} className="chip" aria-current={quien === "todos"}>Ambos</Link>
          {members.map((m) => <Link key={m.id} href={`/entrenamientos?vista=${view}&fecha=${ref}&quien=${m.id}`} className="chip" aria-current={quien === m.id}>{m.id === me.id ? "Mías" : m.display_name}</Link>)}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-2 p-1">
        <Link href={nav(prev)} className="rounded-xl p-2 text-muted" aria-label="Anterior"><ChevronLeft size={18} /></Link>
        <span className="text-sm font-semibold">{view === "mes" ? formatMonth(range.from) : `Semana del ${formatDay(range.from)}`}</span>
        <Link href={nav(next)} className="rounded-xl p-2 text-muted" aria-label="Siguiente"><ChevronRight size={18} /></Link>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="card py-2"><div className="text-lg font-semibold">{doneN}</div><div className="text-xs text-muted">realizadas</div></div>
        <div className="card py-2"><div className="text-lg font-semibold">{cancelled + missed}</div><div className="text-xs text-muted">canceladas o no hechas</div></div>
        <div className="card py-2"><div className="text-lg font-semibold">{attendance == null ? "—" : `${Math.round(attendance * 100)} %`}</div><div className="text-xs text-muted">asistencia</div></div>
      </div>

      {view === "semana" ? (
        <div className="space-y-2">
          {days.map((d) => {
            const ds = sessions.filter((s) => s.date === d);
            return (
              <div key={d} className={`card py-3 ${d === today ? "border-accent" : ""}`}>
                <div className="mb-1 text-sm font-semibold">{formatDay(d)}</div>
                {ds.length === 0 ? <p className="text-xs text-muted">Descanso</p> : <ul className="space-y-1.5">{ds.map((s) => <SessionRow key={s.key} s={s} who={memberById.get(s.member_id)} today={today} />)}</ul>}
              </div>
            );
          })}
        </div>
      ) : (
        <MonthGrid from={range.from} sessions={sessions} today={today} colorOf={(id) => memberById.get(id)?.color ?? "#999"} linkFor={(d) => `/entrenamientos?vista=semana&fecha=${d}&quien=${quien}`} />
      )}

      <Section title="Clases semanales">
        {(series ?? []).length === 0 ? (
          <Empty icon={<Repeat size={24} />} title="Sin clases recurrentes">Al añadir una sesión, marca «Se repite cada semana» para no tener que apuntarla cada vez.</Empty>
        ) : (
          <ul className="card divide-y divide-line p-0">
            {(series ?? []).map((s) => {
              const who = memberById.get(s.member_id);
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: who?.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.activity}</div>
                    <div className="text-xs text-muted">{who?.display_name} · {WD[s.weekday]} {s.start_time.slice(0, 5)} · {s.duration_min} min{s.location ? ` · ${s.location}` : ""}{s.ends_on ? ` · hasta ${formatDay(s.ends_on)}` : ""}</div>
                  </div>
                  <ActionButton action={endSeries.bind(null, s.id, today)} className="text-xs text-muted" confirm="¿Dejar de repetir esta clase? El historial se conserva.">Terminar</ActionButton>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3"><GoalForm current={me.weekly_workout_goal} /></div>
      </Section>
    </>
  );
}

function SessionRow({ s, who, today }: { s: Session; who?: { display_name: string; color: string }; today: string }) {
  const set = (st: string) => (s.id ? setWorkoutStatus.bind(null, s.id, st) : setSeriesOccurrence.bind(null, s.series_id!, s.date, st));
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: who?.color }} title={who?.display_name} />
      <div className="min-w-0 flex-1">
        <div className={`truncate font-medium ${s.status === "cancelado" ? "text-muted line-through" : ""}`}>
          {s.activity} {s.series_id && <Repeat size={11} className="inline text-muted" />}
        </div>
        <div className="truncate text-xs text-muted">{[who?.display_name, s.start_time, s.duration_min && `${s.duration_min} min`, s.location].filter(Boolean).join(" · ")}</div>
      </div>
      {s.status === "realizado" ? <Badge tone="ok">Hecho</Badge> : s.status === "cancelado" ? <Badge>Cancelado</Badge> : s.date < today ? <Badge tone="warn">¿Hecho?</Badge> : null}
      {s.status !== "realizado" && <ActionButton action={set("realizado")} className="rounded-full bg-ok-soft p-1.5 text-ok" title="Marcar realizado"><Check size={15} /></ActionButton>}
      {s.status === "planificado" && <ActionButton action={set("cancelado")} className="rounded-full bg-surface-2 p-1.5 text-muted" title="Cancelar"><X size={15} /></ActionButton>}
      {s.status !== "planificado" && <ActionButton action={set("planificado")} className="text-xs text-muted" title="Deshacer">Deshacer</ActionButton>}
      {s.id && !s.series_id && <ActionButton action={deleteWorkout.bind(null, s.id)} className="rounded p-1 text-muted" confirm="¿Eliminar esta sesión?" title="Eliminar"><Trash2 size={14} /></ActionButton>}
    </li>
  );
}

function MonthGrid({ from, sessions, today, colorOf, linkFor }: { from: string; sessions: Session[]; today: string; colorOf: (id: string) => string; linkFor: (d: string) => string }) {
  const start = startOfWeek(from);
  const end = endOfMonth(from);
  const cells: string[] = [];
  for (let d = start; d <= end || isoWeekday(d) !== 1; d = addDays(d, 1)) cells.push(d);
  return (
    <div className="card p-2">
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] text-muted">{["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const ds = sessions.filter((s) => s.date === d && s.status !== "cancelado");
          const inMonth = d.slice(0, 7) === from.slice(0, 7);
          return (
            <Link key={d} href={linkFor(d)} className={`flex aspect-square flex-col items-center justify-start rounded-lg pt-1 text-xs ${inMonth ? "" : "opacity-30"} ${d === today ? "bg-accent-soft font-semibold text-accent" : "hover:bg-surface-2"}`}>
              {Number(d.slice(8))}
              <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                {ds.slice(0, 4).map((s) => (
                  <span key={s.key} className={`size-1.5 rounded-full ${s.status === "realizado" ? "" : "opacity-40"}`} style={{ background: colorOf(s.member_id) }} />
                ))}
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[11px] text-muted"><Dumbbell size={11} className="inline" /> Punto lleno = realizada · tenue = planificada</p>
    </div>
  );
}
