import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell, ListChecks, UtensilsCrossed } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { loadSessions } from "@/lib/schedule";
import { addDays, formatDay, periodRange, todayISO } from "@/lib/domain/dates";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Calendario" };

/** Calendario común: entrenamientos, tareas con fecha y menú, en una sola vista semanal. */
export default async function Calendario({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, members, household } = await requireMember();
  const today = todayISO(household.timezone);
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha! : today;
  const r = periodRange("week", ref);
  const quien = sp.quien ?? "todos";
  const [sessions, { data: tasks }, { data: meals }] = await Promise.all([
    loadSessions(supabase, r),
    supabase.from("tasks").select("id,title,due_date,assignee_id,status").gte("due_date", r.from).lte("due_date", r.to),
    supabase.from("meal_plan").select("id,plan_date,meal,title").gte("plan_date", r.from).lte("plan_date", r.to),
  ]);
  const byId = new Map(members.map((m) => [m.id, m]));
  const mine = (memberId: string | null) => quien === "todos" || memberId === quien || memberId === null;

  return (
    <>
      <PageHeader title="Calendario" subtitle="Entrenamientos, tareas y menú de los dos." />
      <div className="mb-3 flex gap-1 overflow-x-auto">
        <Link href={`/calendario?fecha=${ref}`} className="chip" aria-current={quien === "todos"}>Ambos</Link>
        {members.map((m) => <Link key={m.id} href={`/calendario?fecha=${ref}&quien=${m.id}`} className="chip" aria-current={quien === m.id}>{m.display_name}</Link>)}
      </div>
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-2 p-1">
        <Link href={`/calendario?fecha=${addDays(r.from, -7)}&quien=${quien}`} className="rounded-xl p-2 text-muted" aria-label="Semana anterior"><ChevronLeft size={18} /></Link>
        <span className="text-sm font-semibold">Semana del {formatDay(r.from)}</span>
        <Link href={`/calendario?fecha=${addDays(r.from, 7)}&quien=${quien}`} className="rounded-xl p-2 text-muted" aria-label="Semana siguiente"><ChevronRight size={18} /></Link>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }, (_, i) => addDays(r.from, i)).map((d) => {
          const ws = sessions.filter((s) => s.date === d && s.status !== "cancelado" && (quien === "todos" || s.member_id === quien));
          const ts = (tasks ?? []).filter((t) => t.due_date === d && mine(t.assignee_id));
          const ms = (meals ?? []).filter((m) => m.plan_date === d);
          const empty = !ws.length && !ts.length && !ms.length;
          return (
            <div key={d} className={`card py-3 ${d === today ? "border-accent" : ""}`}>
              <div className="mb-1 text-sm font-semibold">{formatDay(d)}</div>
              {empty ? <p className="text-xs text-muted">Nada previsto</p> : (
                <ul className="space-y-1 text-sm">
                  {ws.map((s) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <Dumbbell size={14} style={{ color: byId.get(s.member_id)?.color }} />
                      <span className="w-11 text-xs text-muted">{s.start_time ?? ""}</span>
                      <Link href={`/entrenamientos?fecha=${d}`} className={`truncate ${s.status === "realizado" ? "text-muted" : ""}`}>{s.activity} · {byId.get(s.member_id)?.display_name}</Link>
                    </li>
                  ))}
                  {ts.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <ListChecks size={14} className="text-accent" /><span className="w-11" />
                      <Link href={`/tareas/${t.id}`} className={`truncate ${t.status === "hecha" ? "text-muted line-through" : ""}`}>{t.title}</Link>
                    </li>
                  ))}
                  {ms.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-muted">
                      <UtensilsCrossed size={14} /><span className="w-11 text-xs">{m.meal}</span>
                      <Link href={`/compras/menu?semana=${r.from}`} className="truncate">{m.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
