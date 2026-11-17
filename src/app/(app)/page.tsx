import Link from "next/link";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Camera, CheckCircle2, ChevronRight, Dumbbell, ListChecks, PiggyBank, Plus,
  ShoppingBasket, ShoppingCart, Store, UtensilsCrossed, Wallet,
} from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { loadSessions } from "@/lib/schedule";
import { getCategories } from "@/lib/data";
import { addDays, daysBetween, endOfMonth, formatDay, formatLongDay, periodRange, todayISO, type PeriodKind, type Range } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { budgetStatus, byRootCategory, scaleBudget, supermarketTotal, totalIn } from "@/lib/domain/budget";
import { monthProgress, totals, type MonthlyTarget, type SavingsMovement } from "@/lib/domain/savings";
import { bucketLabel, buckets, cumulative, previousRange } from "@/lib/domain/series";
import { AnimatedEuros, AreaChart, Donut, Rings } from "@/components/charts";
import { Progress } from "@/components/ui";
import { PeriodPicker } from "./period-picker";

export const metadata = { title: "Inicio" };

const QUICK = [
  { href: "/gastos?nuevo=gasto", label: "Gasto", icon: Plus },
  { href: "/gastos?nuevo=ticket", label: "Ticket", icon: Camera },
  { href: "/compras?nuevo=producto", label: "Producto", icon: ShoppingCart },
  { href: "/ahorro?nuevo=aportacion", label: "Ahorro", icon: PiggyBank },
  { href: "/tareas?nuevo=tarea", label: "Tarea", icon: ListChecks },
  { href: "/entrenamientos?nuevo=entreno", label: "Entreno", icon: Dumbbell },
];

const PERIOD_LABEL: Record<PeriodKind, string> = { week: "esta semana", month: "este mes", year: "este año", custom: "en el rango" };
const PREV_LABEL: Record<PeriodKind, string> = { week: "Semana anterior", month: "Mes anterior", year: "Año anterior", custom: "Periodo anterior" };

function greeting(tz: string) {
  const h = Number(new Intl.DateTimeFormat("es-ES", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  return h < 6 ? "Buenas noches" : h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
}

export default async function Inicio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, me, members, household } = await requireMember();
  const today = todayISO(household.timezone);
  const isISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  let kind: PeriodKind = (["week", "month", "year", "custom"] as const).find((k) => k === sp.p) ?? "month";
  if (kind === "custom" && !(isISO(sp.desde) && isISO(sp.hasta) && sp.desde! <= sp.hasta!)) kind = "month";
  const range: Range = periodRange(kind, today, kind === "custom" ? { from: sp.desde!, to: sp.hasta! } : undefined);
  const prev = previousRange(kind, range);
  const month = periodRange("month", today);
  const week = periodRange("week", today);
  const qFrom = [prev.from, month.from].sort()[0];
  const qTo = [range.to, month.to].sort().reverse()[0];

  const [
    { data: expenses }, { data: stores }, { data: budgets }, { data: movs }, { data: targets }, { data: goals },
    sessions, { data: tasks }, { data: doneTasks }, { data: meals }, { data: list }, { data: pantry }, { cats },
  ] = await Promise.all([
    supabase.from("expenses").select("id,spent_on,amount_cents,category_id,store_id").gte("spent_on", qFrom).lte("spent_on", qTo),
    supabase.from("stores").select("id,is_supermarket"),
    supabase.from("budgets").select("*").is("category_id", null),
    supabase.from("savings_movements").select("occurred_on,kind,amount_cents,goal_id"),
    supabase.from("savings_monthly_targets").select("*"),
    supabase.from("savings_goals").select("id,kind").eq("kind", "monthly"),
    loadSessions(supabase, { from: week.from, to: addDays(today, 7) }),
    supabase.from("tasks").select("id,title,due_date,assignee_id,priority").neq("status", "hecha").order("due_date", { nullsFirst: false }),
    supabase.from("tasks").select("id").eq("status", "hecha").gte("completed_at", week.from),
    supabase.from("meal_plan").select("meal,title").eq("plan_date", today),
    supabase.from("shopping_items").select("id,checked"),
    supabase.from("inventory_items").select("name,expires_on").not("expires_on", "is", null).lte("expires_on", addDays(today, 2)),
    getCategories(supabase),
  ]);

  const exps = expenses ?? [];
  const inRange = exps.filter((e) => e.spent_on >= range.from && e.spent_on <= range.to);
  const superIds = new Set((stores ?? []).filter((s) => s.is_supermarket).map((s) => s.id));
  const spent = totalIn(exps, range);
  const prevSpent = totalIn(exps, prev);
  const superSpent = supermarketTotal(exps, range, superIds);

  // Presupuesto del periodo
  const tb = budgets?.[0];
  const monthlyBudget = tb ? scaleBudget(tb.amount_cents, tb.period as "week" | "month", "month") : null;
  const periodBudget = !tb ? null
    : kind === "week" ? scaleBudget(tb.amount_cents, tb.period as "week" | "month", "week")
    : kind === "month" ? monthlyBudget : kind === "year" ? monthlyBudget! * 12 : null;
  const bStatus = periodBudget ? budgetStatus(periodBudget, spent, range, today) : null;
  const monthBudget = monthlyBudget ? budgetStatus(monthlyBudget, totalIn(exps, month), month, today) : null;

  // Gráfico: acumulado del periodo frente al anterior
  const bs = buckets(range);
  const prevBs = buckets(prev);
  const cur = cumulative(inRange, bs, today);
  const before = cumulative(exps.filter((e) => e.spent_on >= prev.from && e.spent_on <= prev.to), prevBs);
  const prevAligned = bs.map((_, i) => before[Math.min(i, before.length - 1)] ?? null);
  // Comparación justa: con el mismo punto del periodo anterior (p. ej. del 1 al 9 de cada mes),
  // no con el periodo anterior completo.
  const lastIdx = cur.reduce<number>((a, v, i) => (v != null ? i : a), -1);
  const prevToDate = lastIdx >= 0 ? prevAligned[lastIdx] ?? 0 : prevSpent;
  const ongoing = lastIdx >= 0 && lastIdx < bs.length - 1;
  const compareTo = ongoing ? prevToDate : prevSpent;
  const delta = compareTo > 0 ? (spent - compareTo) / compareTo : null;

  // Donut: 5 categorías principales + «Otras»
  const byCat = [...byRootCategory(exps, cats, range).entries()].sort((a, b) => b[1] - a[1]);
  const catById = new Map(cats.map((c) => [c.id, c]));
  const top = byCat.slice(0, 5).map(([id, v]) => ({ key: id ?? "none", label: id ? catById.get(id)?.name ?? "—" : "Sin categoría", value: v, color: id ? catById.get(id)?.color ?? "#94a3b8" : "#94a3b8" }));
  const rest = byCat.slice(5).reduce((a, [, v]) => a + v, 0);
  const slices = rest ? [...top, { key: "otras", label: "Otras", value: rest, color: "#a3a9a6" }] : top;

  // Ahorro y anillos
  const allMovs = (movs ?? []).map((m) => ({ ...m, kind: m.kind as SavingsMovement["kind"] }));
  const savedInPeriod = totals(allMovs, range);
  const monthlyGoalId = goals?.[0]?.id;
  const sp_ = monthProgress(allMovs, (targets ?? []).filter((t) => t.goal_id === monthlyGoalId) as MonthlyTarget[], today.slice(0, 7));
  const weekDone = sessions.filter((s) => s.status === "realizado" && s.date >= week.from && s.date <= week.to).length;
  const weekGoal = members.reduce((a, m) => a + m.weekly_workout_goal, 0);
  const pendingTasks = tasks ?? [];
  const dueThisWeek = pendingTasks.filter((t) => t.due_date && t.due_date <= week.to).length;
  const doneThisWeek = doneTasks?.length ?? 0;
  const rings = [
    { label: "Ahorro del mes", value: sp_.target ? sp_.net / sp_.target.max_cents : 0, detail: `${formatEuros(sp_.net)}${sp_.target ? ` de ${formatEuros(sp_.target.max_cents)}` : ""}`, color: "var(--ring-1)" },
    { label: "Entrenos de la semana", value: weekGoal ? weekDone / weekGoal : 0, detail: `${weekDone} de ${weekGoal}`, color: "var(--ring-2)" },
    { label: "Tareas de la semana", value: doneThisWeek + dueThisWeek ? doneThisWeek / (doneThisWeek + dueThisWeek) : 0, detail: `${doneThisWeek} hechas · ${dueThisWeek} pendientes`, color: "var(--ring-3)" },
  ];

  const upcoming = sessions.filter((s) => s.status === "planificado" && s.date >= today).slice(0, 3);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const overdue = pendingTasks.filter((t) => t.due_date && t.due_date < today);
  const pendingItems = (list ?? []).filter((i) => !i.checked).length;

  const daysLeft = daysBetween(today, endOfMonth(today));
  const alerts: { tone: "warn" | "danger"; text: string; href: string }[] = [];
  if (monthBudget?.over) alerts.push({ tone: "danger", text: `Presupuesto del mes superado en ${formatEuros(-monthBudget.remaining)}`, href: "/gastos" });
  else if (monthBudget && monthBudget.ratio >= 0.85) alerts.push({ tone: "warn", text: `Habéis usado el ${Math.round(monthBudget.ratio * 100)} % del presupuesto del mes`, href: "/gastos" });
  if (sp_.target && sp_.status === "por_debajo" && daysLeft <= 7) alerts.push({ tone: "warn", text: `Faltan ${formatEuros(sp_.remainingToMin)} para el mínimo de ahorro y quedan ${daysLeft} días`, href: "/ahorro" });
  if (overdue.length) alerts.push({ tone: "danger", text: `${overdue.length} tarea${overdue.length > 1 ? "s" : ""} vencida${overdue.length > 1 ? "s" : ""}`, href: "/tareas" });
  if (pantry?.length) alerts.push({ tone: "warn", text: `Caduca pronto: ${pantry.map((p) => p.name).join(", ")}`, href: "/compras/despensa" });

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="page-in">
          <p className="text-sm text-muted">{formatLongDay(today)}</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{greeting(household.timezone)}, {me.display_name}</h1>
        </div>
        <PeriodPicker kind={kind} from={range.from} to={range.to} />
      </header>

      <nav aria-label="Accesos rápidos" className="stagger mb-6 grid grid-cols-6 gap-2 md:flex md:flex-wrap">
        {QUICK.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="glass lift flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-0.5 py-2.5 text-[11px] font-medium md:flex-row md:gap-2 md:rounded-full md:py-2 md:pr-4 md:pl-2 md:text-sm">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon size={16} /></span>
            {label}
          </Link>
        ))}
      </nav>

      {alerts.length > 0 && (
        <div className="stagger mb-6 grid gap-2 md:grid-cols-2">
          {alerts.map((a) => (
            <Link key={a.text} href={a.href} className={`glass lift flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${a.tone === "danger" ? "text-danger" : "text-warn"}`}>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${a.tone === "danger" ? "bg-danger-soft" : "bg-warn-soft"}`}><AlertTriangle size={15} /></span>
              {a.text}
            </Link>
          ))}
        </div>
      )}

      <div className="stagger grid gap-4 lg:grid-cols-3">
        {/* Gasto + gráfico */}
        <section className="card lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-muted">Gasto {PERIOD_LABEL[kind]}</div>
              <AnimatedEuros cents={spent} className="block text-4xl font-semibold tracking-tight" />
              {delta != null && (
                <div className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${delta > 0 ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
                  {delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(Math.round(delta * 100))} % vs. {ongoing ? "mismo punto del " : ""}{PREV_LABEL[kind].toLowerCase()} ({formatEuros(compareTo)})
                </div>
              )}
            </div>
            <Link href="/gastos" className="flex items-center gap-0.5 text-sm font-medium text-accent">Ver gastos <ChevronRight size={15} /></Link>
          </div>
          <AreaChart
            days={bs.map(bucketLabel)}
            series={[
              { label: "Acumulado", values: cur, color: "var(--accent)" },
              { label: PREV_LABEL[kind], values: prevAligned, color: "var(--muted)", dashed: true },
            ]}
            reference={periodBudget ? { label: `Presupuesto ${formatEuros(periodBudget)}`, value: periodBudget } : undefined}
          />
        </section>

        {/* Reparto por categoría */}
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Por categoría</h2>
            <Link href="/gastos" className="text-muted" aria-label="Ver gastos"><ChevronRight size={16} /></Link>
          </div>
          {slices.length ? <Donut data={slices} centerLabel="Total" size={150} /> : (
            <p className="py-10 text-center text-sm text-muted">Sin gastos {PERIOD_LABEL[kind]}.</p>
          )}
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-4">
          <Link href="/gastos" className="card lift block">
            <div className="flex items-center gap-2 text-xs font-medium text-muted"><Kpi icon={<Store size={14} />} />En supermercados</div>
            <AnimatedEuros cents={superSpent} className="mt-2 block text-2xl font-semibold tracking-tight" />
            <div className="text-xs text-muted">{spent ? `${Math.round((superSpent / spent) * 100)} % del gasto` : "—"}</div>
          </Link>
          <Link href="/gastos/presupuestos" className="card lift block">
            <div className="flex items-center gap-2 text-xs font-medium text-muted"><Kpi icon={<Wallet size={14} />} />Presupuesto disponible</div>
            {bStatus ? (
              <>
                <AnimatedEuros cents={bStatus.remaining} className={`mt-2 block text-2xl font-semibold tracking-tight ${bStatus.over ? "text-danger" : ""}`} />
                <Progress value={bStatus.ratio} tone={bStatus.over ? "danger" : bStatus.ratio > 0.85 ? "warn" : "accent"} label="Presupuesto usado" />
                <div className="mt-1 text-xs text-muted">de {formatEuros(bStatus.budget)}</div>
              </>
            ) : <><div className="mt-2 text-2xl font-semibold">—</div><div className="text-xs text-muted">{kind === "custom" ? "Elige semana, mes o año" : "Toca para definirlo"}</div></>}
          </Link>
          <Link href="/ahorro" className="card lift block">
            <div className="flex items-center gap-2 text-xs font-medium text-muted"><Kpi icon={<PiggyBank size={14} />} />Apartado {PERIOD_LABEL[kind]}</div>
            <AnimatedEuros cents={savedInPeriod.net} className="mt-2 block text-2xl font-semibold tracking-tight" />
            <div className="text-xs text-muted">{savedInPeriod.withdrawals ? `${formatEuros(savedInPeriod.deposits)} aportado · ${formatEuros(savedInPeriod.withdrawals)} retirado` : "Dinero realmente ahorrado"}</div>
          </Link>
          <Link href="/compras" className="card lift block">
            <div className="flex items-center gap-2 text-xs font-medium text-muted"><Kpi icon={<ShoppingBasket size={14} />} />Compra semanal</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{pendingItems || "Vacía"} <span className="text-sm font-normal text-muted">{pendingItems ? `producto${pendingItems > 1 ? "s" : ""}` : ""}</span></div>
            <div className="text-xs text-muted">Coste estimado en la 2ª entrega</div>
          </Link>
        </div>

        {/* Anillos */}
        <section className="card">
          <h2 className="mb-4 text-sm font-medium text-muted">Anillos del hogar</h2>
          <Rings data={rings} size={132} />
        </section>

        {/* Menú de hoy */}
        <Link href="/compras/menu" className="card lift block">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted"><Kpi icon={<UtensilsCrossed size={14} />} />Menú de hoy</h2>
          {meals?.length ? (
            <ul className="space-y-2">{meals.map((m) => <li key={m.meal + m.title}><div className="text-xs text-muted">{m.meal}</div><div className="font-medium">{m.title}</div></li>)}</ul>
          ) : <p className="text-sm text-muted">Sin planificar. Toca para preparar el menú.</p>}
        </Link>

        {/* Próximos entrenamientos */}
        <Link href="/entrenamientos" className="card lift block">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted"><Kpi icon={<Dumbbell size={14} />} />Próximos entrenamientos</h2>
          {upcoming.length ? (
            <ul className="space-y-2.5">
              {upcoming.map((s) => (
                <li key={s.key} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold text-white" style={{ background: memberById.get(s.member_id)?.color }}>
                    {memberById.get(s.member_id)?.display_name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{s.activity}</div><div className="text-xs text-muted">{s.date === today ? "Hoy" : formatDay(s.date)} {s.start_time ?? ""}</div></div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nada en los próximos días.</p>}
        </Link>

        {/* Tareas */}
        <Link href="/tareas" className="card lift block lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted"><Kpi icon={<ListChecks size={14} />} />Tareas pendientes</h2>
            <span className="text-xs text-muted">{pendingTasks.length} en total</span>
          </div>
          {pendingTasks.length ? (
            <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
              {pendingTasks.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <span className={`size-2 rounded-full ${t.priority === "alta" ? "bg-danger" : "bg-line"}`} />
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-muted">{t.assignee_id ? memberById.get(t.assignee_id)?.display_name : "Los dos"}</span>
                  {t.due_date && <span className={`text-xs ${t.due_date < today ? "text-danger" : "text-muted"}`}>{formatDay(t.due_date)}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="flex items-center gap-1.5 text-sm text-muted"><CheckCircle2 size={14} />Todo al día.</p>}
        </Link>
      </div>
    </>
  );
}

function Kpi({ icon }: { icon: React.ReactNode }) {
  return <span className="flex size-6 items-center justify-center rounded-lg bg-accent-soft text-accent">{icon}</span>;
}
