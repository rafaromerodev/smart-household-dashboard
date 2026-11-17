import Link from "next/link";
import { PiggyBank, Trash2, Pencil } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { addMonths, endOfMonth, formatDay, formatMonth, todayISO } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { balance, monthProgress, monthlySeries, monthsOfYear, totals, type MonthlyTarget, type SavingsMovement } from "@/lib/domain/savings";
import { scaleBudget, underBudget } from "@/lib/domain/budget";
import { ActionButton } from "@/components/forms";
import { Badge, Empty, MemberDot, PageHeader, Progress, Section } from "@/components/ui";
import { MonthBars } from "@/components/month-bars";
import { NewGoal, SavingsActions } from "./forms";
import { archiveGoal, deleteMovement } from "./actions";

export const metadata = { title: "Ahorro" };

const STATUS = {
  sin_meta: { label: "Sin meta", tone: "default" },
  por_debajo: { label: "Por debajo de la meta", tone: "warn" },
  minimo: { label: "Mínimo alcanzado", tone: "ok" },
  completo: { label: "Meta completa", tone: "ok" },
} as const;

const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default async function AhorroPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, me, members, household } = await requireMember();
  const today = todayISO(household.timezone);
  const month = today.slice(0, 7);
  const year = /^\d{4}$/.test(sp.anio ?? "") ? Number(sp.anio) : Number(today.slice(0, 4));

  const [{ data: goals }, { data: targets }, { data: movs }, { data: budgets }] = await Promise.all([
    supabase.from("savings_goals").select("*").eq("archived", false).order("created_at"),
    supabase.from("savings_monthly_targets").select("*").order("valid_from"),
    supabase.from("savings_movements").select("*").order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("budgets").select("*").is("category_id", null),
  ]);
  const monthlyGoal = (goals ?? []).find((g) => g.kind === "monthly");
  const all = (movs ?? []).map((m) => ({ ...m, kind: m.kind as SavingsMovement["kind"] }));
  const tg = (targets ?? []).filter((t) => t.goal_id === monthlyGoal?.id) as MonthlyTarget[];
  const p = monthProgress(all, tg, month);
  const series = monthlySeries(all, tg, monthsOfYear(year));
  const yearTotals = totals(all, { from: `${year}-01-01`, to: `${year}-12-31` });
  const memberById = new Map(members.map((m) => [m.id, m]));
  const goalById = new Map((goals ?? []).map((g) => [g.id, g]));

  // Concepto 2 (reducción de gasto vs. presupuesto): último mes cerrado, si hay presupuesto total.
  const prevMonthStart = addMonths(month + "-01", -1);
  const totalBudget = budgets?.[0];
  let under: number | null = null;
  if (totalBudget) {
    const { data: prevExp } = await supabase.from("expenses").select("amount_cents").gte("spent_on", prevMonthStart).lte("spent_on", endOfMonth(prevMonthStart));
    const spent = (prevExp ?? []).reduce((a, e) => a + e.amount_cents, 0);
    under = underBudget(scaleBudget(totalBudget.amount_cents, totalBudget.period as "week" | "month", "month"), spent);
  }

  const st = STATUS[p.status];
  const goalOptions = (goals ?? []).map((g) => ({ id: g.id, name: g.name }));

  return (
    <>
      <PageHeader title="Ahorro" subtitle="Dinero que apartáis de verdad cada mes." />

      <div className="card mb-3">
        <div className="text-xs font-medium text-muted">Saldo disponible</div>
        <div className="text-3xl font-semibold tracking-tight">{formatEuros(balance(all))}</div>
        <div className="mt-1 text-xs text-muted">
          Aportado en total {formatEuros(totals(all).deposits)} · retirado {formatEuros(totals(all).withdrawals)}
        </div>
      </div>

      <div className="card mb-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{formatMonth(month)}</div>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <div className="mt-1 text-2xl font-semibold">{formatEuros(p.net)}
          {p.target && <span className="text-sm font-normal text-muted"> de {p.target.min_cents === p.target.max_cents ? formatEuros(p.target.max_cents) : `${formatEuros(p.target.min_cents)}–${formatEuros(p.target.max_cents)}`}</span>}
        </div>
        <Progress value={p.ratio} marker={p.target && p.target.max_cents ? p.target.min_cents / p.target.max_cents : undefined} tone={p.status === "por_debajo" ? "warn" : "ok"} label="Progreso de la meta mensual" />
        <div className="mt-1 text-xs text-muted">
          {p.target ? (p.remainingToMin > 0 ? `Faltan ${formatEuros(p.remainingToMin)} para el mínimo` : p.remainingToMax > 0 ? `Faltan ${formatEuros(p.remainingToMax)} para el máximo` : "¡Objetivo del mes cumplido!") : "Define una meta mensual"}
          {p.withdrawn > 0 && ` · Retirado este mes: ${formatEuros(p.withdrawn)}`}
        </div>
      </div>

      {monthlyGoal && (
        <SavingsActions goals={goalOptions} members={members.map((m) => ({ id: m.id, display_name: m.display_name }))} meId={me.id} today={today}
          currentMonth={month} monthlyGoalId={monthlyGoal.id}
          target={p.target ? { min: euros(p.target.min_cents), max: p.target.max_cents !== p.target.min_cents ? euros(p.target.max_cents) : "" } : null} />
      )}

      <Section title={`Año ${year}`} action={
        <div className="flex gap-3 text-xs font-medium text-accent">
          <Link href={`/ahorro?anio=${year - 1}`}>← {year - 1}</Link>
          {year < Number(today.slice(0, 4)) && <Link href={`/ahorro?anio=${year + 1}`}>{year + 1} →</Link>}
        </div>
      }>
        <div className="card">
          <div className="mb-3 flex justify-between text-sm">
            <span className="text-muted">Neto del año</span>
            <span className="font-semibold">{formatEuros(yearTotals.net)}</span>
          </div>
          <MonthBars title={`Ahorro neto por mes en ${year} frente a la meta`} data={series.map((s) => ({
            key: s.month, label: formatMonth(s.month).split(" ")[0], value: s.net, min: s.target?.min_cents ?? null, max: s.target?.max_cents ?? null,
          }))} />
          <div className="mt-2 text-xs text-muted">
            Meses con meta cumplida: {series.filter((s) => s.status === "minimo" || s.status === "completo").length} de {series.filter((s) => s.target && s.month <= month).length}
          </div>
        </div>
      </Section>

      <Section title="Otros conceptos (no se suman)">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="card">
            <div className="text-xs font-medium text-muted">Por debajo del presupuesto · {formatMonth(prevMonthStart)}</div>
            <div className="text-lg font-semibold">{under == null ? "—" : formatEuros(under)}</div>
            <div className="text-xs text-muted">{under == null ? "Define un presupuesto total para calcularlo." : "Gastasteis menos de lo previsto. No es dinero apartado."}</div>
          </div>
          <div className="card">
            <div className="text-xs font-medium text-muted">Ahorro por comprar mejor</div>
            <div className="text-lg font-semibold">—</div>
            <div className="text-xs text-muted">Llegará con la comparación de precios (2ª entrega). Se mostrará como estimado o comprobado.</div>
          </div>
        </div>
      </Section>

      <Section title="Objetivos" action={<NewGoal />}>
        {(goals ?? []).filter((g) => g.kind === "target").length === 0 ? (
          <p className="text-sm text-muted">Podéis crear huchas para metas concretas (viaje, imprevistos…).</p>
        ) : (
          <div className="space-y-2">
            {(goals ?? []).filter((g) => g.kind === "target").map((g) => {
              const b = balance(all.filter((m) => m.goal_id === g.id));
              return (
                <div key={g.id} className="card">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{g.name}</span>
                    <ActionButton action={archiveGoal.bind(null, g.id)} className="text-xs text-muted" confirm="¿Archivar este objetivo?">Archivar</ActionButton>
                  </div>
                  <Progress value={g.target_cents ? b / g.target_cents : 0} />
                  <div className="mt-1 text-xs text-muted">{formatEuros(b)} de {formatEuros(g.target_cents ?? 0)}{g.target_date && ` · para el ${formatDay(g.target_date)}`}</div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Movimientos">
        {(movs ?? []).length === 0 ? (
          <Empty icon={<PiggyBank size={28} />} title="Aún no hay aportaciones">Registrad la primera con «Aportar».</Empty>
        ) : (
          <ul className="card divide-y divide-line p-0">
            {(movs ?? []).map((m) => {
              const who = m.member_id ? memberById.get(m.member_id) : null;
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.kind === "deposit" ? m.concept || "Aportación" : `Retirada: ${m.reason}`}</div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{formatDay(m.occurred_on)}</span>
                      {goalById.get(m.goal_id)?.kind === "target" && <span>· {goalById.get(m.goal_id)?.name}</span>}
                      {who && <MemberDot color={who.color} name={who.display_name} />}
                    </div>
                  </div>
                  <span className={`font-semibold ${m.kind === "deposit" ? "text-ok" : "text-danger"}`}>{m.kind === "deposit" ? "+" : "−"}{formatEuros(m.amount_cents)}</span>
                  <Link href={`/ahorro/${m.id}`} className="rounded-lg p-1.5 text-muted" aria-label="Editar"><Pencil size={15} /></Link>
                  <ActionButton action={deleteMovement.bind(null, m.id)} className="rounded-lg p-1.5 text-muted" confirm="¿Eliminar este movimiento?" title="Eliminar"><Trash2 size={15} /></ActionButton>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
