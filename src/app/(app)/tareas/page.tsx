import Link from "next/link";
import { Check, ListChecks, Repeat } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { addDays, formatDay, todayISO } from "@/lib/domain/dates";
import { ActionButton } from "@/components/forms";
import { Badge, Empty, PageHeader, Section } from "@/components/ui";
import { setTaskDone } from "./actions";
import { NewTask } from "./task-form";

export const metadata = { title: "Tareas" };
const PRIO = { alta: 0, media: 1, baja: 2 } as Record<string, number>;

export default async function Tareas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, me, members, household } = await requireMember();
  const today = todayISO(household.timezone);
  const quien = sp.quien ?? "todos";
  const ver = sp.ver === "hechas" ? "hechas" : "pendientes";

  let q = supabase.from("tasks").select("*");
  q = ver === "hechas" ? q.eq("status", "hecha").order("completed_at", { ascending: false }).limit(50) : q.neq("status", "hecha");
  if (quien === "mias") q = q.or(`assignee_id.eq.${me.id},assignee_id.is.null`);
  else if (quien !== "todos") q = q.eq("assignee_id", quien);
  const [{ data: tasks }, { data: cats }] = await Promise.all([q, supabase.from("tasks").select("category").not("category", "is", null).limit(200)]);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const list = (tasks ?? []).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || PRIO[a.priority] - PRIO[b.priority]);

  const groups = ver === "hechas" ? [{ title: "Completadas", items: list }] : [
    { title: "Vencidas", items: list.filter((t) => t.due_date && t.due_date < today) },
    { title: "Hoy", items: list.filter((t) => t.due_date === today) },
    { title: "Próximos 7 días", items: list.filter((t) => t.due_date && t.due_date > today && t.due_date <= addDays(today, 7)) },
    { title: "Más adelante", items: list.filter((t) => t.due_date && t.due_date > addDays(today, 7)) },
    { title: "Sin fecha", items: list.filter((t) => !t.due_date) },
  ];

  const link = (o: Record<string, string>) => `/tareas?${new URLSearchParams({ quien, ver, ...o })}`;

  return (
    <>
      <PageHeader title="Tareas" action={<NewTask members={members.map((m) => ({ id: m.id, display_name: m.display_name }))} today={today} categories={[...new Set((cats ?? []).map((c) => c.category!))]} />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          <Link href={link({ ver: "pendientes" })} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${ver === "pendientes" ? "bg-surface-strong shadow-sm" : "text-muted"}`}>Pendientes</Link>
          <Link href={link({ ver: "hechas" })} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${ver === "hechas" ? "bg-surface-strong shadow-sm" : "text-muted"}`}>Hechas</Link>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <Link href={link({ quien: "todos" })} className="chip" aria-current={quien === "todos"}>Todas</Link>
          <Link href={link({ quien: "mias" })} className="chip" aria-current={quien === "mias"}>Mías</Link>
          {members.filter((m) => m.id !== me.id).map((m) => <Link key={m.id} href={link({ quien: m.id })} className="chip" aria-current={quien === m.id}>{m.display_name}</Link>)}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty icon={<ListChecks size={28} />} title={ver === "hechas" ? "Nada completado todavía" : "¡Nada pendiente!"}>
          {ver === "pendientes" && "Crea tareas puntuales o recurrentes, como preparar el menú o revisar la nevera."}
        </Empty>
      ) : groups.filter((g) => g.items.length).map((g) => (
        <Section key={g.title} title={`${g.title} (${g.items.length})`}>
          <ul className="card divide-y divide-line p-0">
            {g.items.map((t) => {
              const who = t.assignee_id ? memberById.get(t.assignee_id) : null;
              const isDone = t.status === "hecha";
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <ActionButton action={setTaskDone.bind(null, t.id, !isDone)} title={isDone ? "Reabrir" : "Completar"}
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${isDone ? "border-accent bg-accent text-accent-ink" : t.priority === "alta" ? "border-danger" : "border-line"}`}>
                    {isDone ? <Check size={16} strokeWidth={3} /> : null}
                  </ActionButton>
                  <Link href={`/tareas/${t.id}`} className="min-w-0 flex-1">
                    <div className={`truncate font-medium ${isDone ? "text-muted line-through" : ""}`}>
                      {t.title} {t.recurrence !== "none" && <Repeat size={12} className="inline text-muted" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      {t.due_date && <span className={!isDone && t.due_date < today ? "text-danger" : ""}>{formatDay(t.due_date)}</span>}
                      <span>{who ? who.display_name : "Los dos"}</span>
                      {t.category && <span>· {t.category}</span>}
                      {t.status === "en_curso" && <Badge tone="accent">En curso</Badge>}
                      {t.priority === "alta" && !isDone && <Badge tone="danger">Alta</Badge>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
    </>
  );
}
