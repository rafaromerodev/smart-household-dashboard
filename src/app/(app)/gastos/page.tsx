import Link from "next/link";
import { Paperclip, ReceiptText, Settings2, Target } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { getCategories, getStores } from "@/lib/data";
import { endOfMonth, formatDay, todayISO } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { budgetStatus, byRootCategory, scaleBudget } from "@/lib/domain/budget";
import { Empty, PageHeader, Progress, Section, MemberDot } from "@/components/ui";
import { MonthNav, parseMonth } from "@/components/month-nav";
import { NewExpense } from "./new-expense";

export const metadata = { title: "Gastos" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function GastosPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { supabase, me, members, household } = await requireMember();
  const today = todayISO(household.timezone);
  const month = parseMonth(sp.mes, today.slice(0, 7));
  const quien = typeof sp.quien === "string" ? sp.quien : "todos";
  const range = { from: month + "-01", to: endOfMonth(month + "-01") };

  const [{ cats, roots, options }, stores, { data: expenses }, { data: budgets }] = await Promise.all([
    getCategories(supabase),
    getStores(supabase),
    supabase.from("expenses").select("*").gte("spent_on", range.from).lte("spent_on", range.to)
      .order("spent_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("budgets").select("*"),
  ]);

  const all = expenses ?? [];
  const list = all.filter((e) =>
    quien === "todos" ? true : quien === "compartido" ? e.scope === "shared" : e.scope === "personal" && e.member_id === quien,
  );
  const ids = list.map((e) => e.id);
  const { data: lines } = ids.length
    ? await supabase.from("expense_lines").select("expense_id,amount_cents,category_id").in("expense_id", ids)
    : { data: [] };

  const total = list.reduce((a, e) => a + e.amount_cents, 0);
  const byCat = byRootCategory(list, cats, range, lines ?? []);
  const catRows = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const catById = new Map(cats.map((c) => [c.id, c]));
  const memberById = new Map(members.map((m) => [m.id, m]));

  const totalBudgetRow = (budgets ?? []).find((b) => !b.category_id);
  const monthlyBudget = totalBudgetRow ? scaleBudget(totalBudgetRow.amount_cents, totalBudgetRow.period as "week" | "month", "month") : null;
  const status = monthlyBudget ? budgetStatus(monthlyBudget, all.reduce((a, e) => a + e.amount_cents, 0), range, today) : null;

  const byDay = new Map<string, typeof list>();
  for (const e of list) byDay.set(e.spent_on, [...(byDay.get(e.spent_on) ?? []), e]);

  const chip = (key: string, label: string) => (
    <Link key={key} href={`/gastos?mes=${month}&quien=${key}`} className="chip shrink-0" aria-current={quien === key}>{label}</Link>
  );

  return (
    <>
      <PageHeader
        title="Gastos"
        action={
          <NewExpense
            categories={options} stores={stores.map((s) => s.name)}
            members={members.map((m) => ({ id: m.id, display_name: m.display_name }))}
            meId={me.id} householdId={household.id} today={today}
          />
        }
      />
      <MonthNav month={month} basePath="/gastos" params={{ quien }} />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {chip("todos", "Todos")}
        {chip("compartido", "Compartidos")}
        {members.map((m) => chip(m.id, `Personal ${m.display_name}`))}
      </div>

      <div className="card mb-6">
        <div className="text-xs font-medium text-muted">Total {quien === "todos" ? "del mes" : "filtrado"}</div>
        <div className="text-3xl font-semibold tracking-tight">{formatEuros(total)}</div>
        {status && quien === "todos" && (
          <>
            <Progress value={status.ratio} tone={status.over ? "danger" : status.ratio > 0.85 ? "warn" : "accent"} label="Presupuesto" />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{status.over ? `Excedido en ${formatEuros(-status.remaining)}` : `Quedan ${formatEuros(status.remaining)}`}</span>
              <span>Presupuesto {formatEuros(status.budget)}</span>
            </div>
            {status.projected != null && status.projected > status.budget && (
              <p className="mt-1 text-xs text-warn">A este ritmo acabaríais el mes en {formatEuros(status.projected)}.</p>
            )}
          </>
        )}
        {!monthlyBudget && (
          <Link href="/gastos/presupuestos" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent"><Target size={14} /> Definir presupuesto mensual</Link>
        )}
      </div>

      {catRows.length > 0 && (
        <Section title="Por categoría">
          <div className="card space-y-3">
            {catRows.map(([id, v]) => {
              const c = id ? catById.get(id) : null;
              return (
                <div key={id ?? "none"}>
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: c?.color ?? "#94a3b8" }} />{c?.name ?? "Sin categoría"}</span>
                    <span className="font-medium">{formatEuros(v)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${total ? (v / total) * 100 : 0}%`, background: c?.color ?? "#94a3b8" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Movimientos" action={
        <div className="flex gap-3 text-xs font-medium text-accent">
          <Link href="/gastos/categorias" className="flex items-center gap-1"><Settings2 size={14} />Categorías</Link>
          <Link href="/gastos/presupuestos" className="flex items-center gap-1"><Target size={14} />Presupuestos</Link>
        </div>
      }>
        {list.length === 0 ? (
          <Empty icon={<ReceiptText size={28} />} title="Sin gastos este mes">
            Añade el primero con el botón «Gasto». Puedes adjuntar la foto del ticket.
          </Empty>
        ) : (
          <div className="space-y-4">
            {[...byDay.entries()].map(([day, items]) => (
              <div key={day}>
                <div className="mb-1 px-1 text-xs font-medium text-muted">{formatDay(day)}</div>
                <ul className="card divide-y divide-line p-0">
                  {items.map((e) => {
                    const c = e.category_id ? catById.get(e.category_id) : null;
                    const parent = c?.parent_id ? catById.get(c.parent_id) : null;
                    const m = e.member_id ? memberById.get(e.member_id) : null;
                    return (
                      <li key={e.id}>
                        <Link href={`/gastos/${e.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-surface-2">
                          <span className="size-2.5 shrink-0 rounded-full" style={{ background: c?.color ?? "#94a3b8" }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate font-medium">
                              {e.merchant}
                              {e.receipt_id && <Paperclip size={12} className="text-muted" />}
                            </div>
                            <div className="flex items-center gap-2 truncate text-xs text-muted">
                              {parent ? `${parent.name} › ${c?.name}` : c?.name ?? "Sin categoría"}
                              {m && <MemberDot color={m.color} name={e.scope === "personal" ? `${m.display_name} · personal` : m.display_name} />}
                            </div>
                          </div>
                          <span className="font-semibold">{formatEuros(e.amount_cents)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
      {roots.length === 0 && <p className="text-sm text-muted">No hay categorías.</p>}
    </>
  );
}
