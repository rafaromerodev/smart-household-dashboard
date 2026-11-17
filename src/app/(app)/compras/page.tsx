import Link from "next/link";
import { requireMember } from "@/lib/supabase/server";
import { addDays, periodRange, todayISO } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { ShoppingList } from "./shopping-list";

export const metadata = { title: "Lista de la compra" };

export default async function ComprasPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, members, household } = await requireMember();
  const today = todayISO(household.timezone);
  const { data: list } = await supabase.from("shopping_lists").select("id").eq("status", "activa").order("created_at").limit(1).maybeSingle();
  const { data: items } = list
    ? await supabase.from("shopping_items").select("*").eq("list_id", list.id).order("created_at")
    : { data: [] };

  // Referencia REAL: media semanal en supermercados de las 4 semanas completas anteriores.
  const thisWeek = periodRange("week", today);
  const from = addDays(thisWeek.from, -28);
  const to = addDays(thisWeek.from, -1);
  const { data: stores } = await supabase.from("stores").select("id").eq("is_supermarket", true);
  const ids = (stores ?? []).map((s) => s.id);
  const { data: past } = ids.length
    ? await supabase.from("expenses").select("amount_cents").in("store_id", ids).gte("spent_on", from).lte("spent_on", to)
    : { data: [] };
  const sum = (past ?? []).reduce((a, e) => a + e.amount_cents, 0);

  return (
    <>
      <ShoppingList
        focus={sp.nuevo === "producto"}
        items={(items ?? []).map((i) => ({ ...i, quantity: i.quantity == null ? null : Number(i.quantity) }))}
        members={Object.fromEntries(members.map((m) => [m.id, { name: m.display_name, color: m.color }]))}
      />
      <div className="card mt-6 text-sm">
        <div className="text-xs font-medium text-muted">Referencia de gasto semanal en supermercado</div>
        {past && past.length > 0 ? (
          <p className="mt-1"><span className="text-lg font-semibold">{formatEuros(Math.round(sum / 4))}</span> <span className="text-muted">de media en las 4 últimas semanas (gastos reales registrados)</span></p>
        ) : (
          <p className="mt-1 text-muted">Sin datos todavía. Registrad los tickets de Mercadona y Carrefour en <Link href="/gastos" className="text-accent">Gastos</Link> para ver la media real.</p>
        )}
        <p className="mt-2 text-xs text-muted">El coste estimado de la lista llegará con el historial de precios (2ª entrega): no mostramos precios inventados.</p>
      </div>
    </>
  );
}
