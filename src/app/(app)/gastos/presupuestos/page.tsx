import Link from "next/link";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { endOfMonth, todayISO, periodRange } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { budgetStatus, byRootCategory } from "@/lib/domain/budget";
import { ActionButton } from "@/components/forms";
import { Empty, PageHeader, Progress, Section } from "@/components/ui";
import { upsertBudget, deleteBudget } from "../actions";
import { InlineForm } from "@/components/inline-form";

export const metadata = { title: "Presupuestos" };

export default async function Presupuestos() {
  const { supabase, household } = await requireMember();
  const today = todayISO(household.timezone);
  const month = { from: today.slice(0, 8) + "01", to: endOfMonth(today) };
  const week = periodRange("week", today);
  const [{ cats, roots }, { data: budgets }, { data: exps }] = await Promise.all([
    getCategories(supabase),
    supabase.from("budgets").select("*"),
    supabase.from("expenses").select("id,spent_on,amount_cents,category_id").gte("spent_on", week.from < month.from ? week.from : month.from).lte("spent_on", month.to > week.to ? month.to : week.to),
  ]);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const spentFor = (categoryId: string | null, period: string) => {
    const r = period === "week" ? week : month;
    if (!categoryId) return (exps ?? []).filter((e) => e.spent_on >= r.from && e.spent_on <= r.to).reduce((a, e) => a + e.amount_cents, 0);
    return byRootCategory(exps ?? [], cats, r).get(categoryId) ?? 0;
  };

  return (
    <>
      <Link href="/gastos" className="mb-2 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} />Gastos</Link>
      <PageHeader title="Presupuestos" subtitle="Un presupuesto total y, si queréis, uno por categoría. Semanal o mensual." />

      <Section title="Añadir o actualizar">
        <div className="card">
          <InlineForm action={upsertBudget} submit="Guardar">
            <select className="field flex-1" name="categoria" defaultValue="">
              <option value="">Total (todas las categorías)</option>
              {roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select className="field w-32" name="periodo" defaultValue="month">
              <option value="month">Mensual</option>
              <option value="week">Semanal</option>
            </select>
            <input className="field w-28" name="importe" inputMode="decimal" placeholder="€" required />
          </InlineForm>
        </div>
      </Section>

      {(budgets ?? []).length === 0 ? (
        <Empty title="Sin presupuestos">Cuando defináis uno, el inicio mostrará el disponible y avisará si os acercáis al límite.</Empty>
      ) : (
        <div className="space-y-3">
          {(budgets ?? []).map((b) => {
            const s = budgetStatus(b.amount_cents, spentFor(b.category_id, b.period));
            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.category_id ? catName.get(b.category_id) : "Total"}</div>
                    <div className="text-xs text-muted">{b.period === "week" ? "Semanal · esta semana" : "Mensual · este mes"}</div>
                  </div>
                  <ActionButton action={deleteBudget.bind(null, b.id)} className="rounded-lg p-2 text-danger" confirm="¿Eliminar este presupuesto?" title="Eliminar"><Trash2 size={16} /></ActionButton>
                </div>
                <Progress value={s.ratio} tone={s.over ? "danger" : s.ratio > 0.85 ? "warn" : "accent"} />
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>{formatEuros(s.spent)} gastado</span>
                  <span>{s.over ? `Excedido ${formatEuros(-s.remaining)}` : `Quedan ${formatEuros(s.remaining)}`} de {formatEuros(s.budget)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
