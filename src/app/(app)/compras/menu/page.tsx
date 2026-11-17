import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, ListPlus, X, AlertTriangle } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { addDays, formatDay, startOfWeek, todayISO } from "@/lib/domain/dates";
import { atRisk } from "@/lib/domain/shopping";
import { ActionButton } from "@/components/forms";
import { Badge, Section } from "@/components/ui";
import { copyPreviousWeek, deleteMeal, generateFromMenu, weekNeeds } from "../actions";
import { AddMeal } from "./meal-form";

export const metadata = { title: "Menú semanal" };

const ORDER = { desayuno: 0, comida: 1, cena: 2 } as Record<string, number>;

export default async function MenuPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, household } = await requireMember();
  const today = todayISO(household.timezone);
  const week = startOfWeek(/^\d{4}-\d{2}-\d{2}$/.test(sp.semana ?? "") ? sp.semana! : today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  const [{ data: meals }, { data: recipes }, { data: pantry }, needs] = await Promise.all([
    supabase.from("meal_plan").select("*").gte("plan_date", week).lte("plan_date", days[6]),
    supabase.from("recipes").select("id,name").order("name"),
    supabase.from("inventory_items").select("name,expires_on"),
    weekNeeds(week),
  ]);
  const risky = atRisk(pantry ?? [], today, addDays(today, 4));

  return (
    <>
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-2 p-1">
        <Link href={`/compras/menu?semana=${addDays(week, -7)}`} className="rounded-xl p-2 text-muted" aria-label="Semana anterior"><ChevronLeft size={18} /></Link>
        <span className="text-sm font-semibold">Semana del {formatDay(week)}</span>
        <Link href={`/compras/menu?semana=${addDays(week, 7)}`} className="rounded-xl p-2 text-muted" aria-label="Semana siguiente"><ChevronRight size={18} /></Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <ActionButton action={generateFromMenu.bind(null, week)} className="btn-primary"><ListPlus size={16} />Generar lista</ActionButton>
        <ActionButton action={copyPreviousWeek.bind(null, week)} className="btn-ghost" confirm="¿Copiar los platos de la semana anterior a esta?"><Copy size={16} />Copiar anterior</ActionButton>
      </div>

      {risky.length > 0 && (
        <div className="mb-4 flex gap-2 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
          <AlertTriangle size={18} className="shrink-0" />
          <span>Aprovechad pronto: {risky.map((r) => `${r.name} (${formatDay(r.expires_on!)})`).join(", ")}.</span>
        </div>
      )}

      <div className="space-y-2">
        {days.map((d) => {
          const dm = (meals ?? []).filter((m) => m.plan_date === d).sort((a, b) => ORDER[a.meal] - ORDER[b.meal]);
          return (
            <div key={d} className={`card py-3 ${d === today ? "border-accent" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{formatDay(d)}{d === today && <span className="ml-2"><Badge tone="accent">Hoy</Badge></span>}</span>
                <AddMeal date={d} label={formatDay(d)} recipes={recipes ?? []} />
              </div>
              {dm.length === 0 ? <p className="text-xs text-muted">Sin planificar</p> : (
                <ul className="mt-1 space-y-1">
                  {dm.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="w-16 shrink-0 text-xs text-muted">{m.meal}</span>
                      <span className="flex-1 truncate">{m.recipe_id ? <Link href={`/compras/recetas/${m.recipe_id}`} className="underline decoration-line underline-offset-2">{m.title}</Link> : m.title}</span>
                      {m.servings !== 2 && <span className="text-xs text-muted">{m.servings} rac.</span>}
                      <ActionButton action={deleteMeal.bind(null, m.id)} className="rounded p-1 text-muted" title="Quitar"><X size={14} /></ActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <Section title="Ingredientes de la semana">
        {needs == null ? (
          <p className="text-sm text-muted">Usa recetas de la biblioteca en el menú para calcular ingredientes, repeticiones y lo que ya tenéis en casa.</p>
        ) : (
          <ul className="card divide-y divide-line p-0 text-sm">
            {needs.map((n) => (
              <li key={n.name + n.unit} className="flex items-center gap-2 px-4 py-2">
                <span className={`flex-1 ${n.covered ? "text-muted line-through" : ""}`}>{n.name}</span>
                {n.repeated && <Badge tone="accent">en {n.usedIn.length} platos</Badge>}
                {n.covered && <Badge tone="ok">en casa</Badge>}
                <span className="w-20 text-right text-xs text-muted">
                  {n.toBuy != null ? `${n.toBuy.toLocaleString("es-ES")} ${n.unit ?? ""}` : "—"}
                  {n.inStock ? ` (hay ${n.inStock.toLocaleString("es-ES")})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
