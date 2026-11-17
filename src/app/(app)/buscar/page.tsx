import Link from "next/link";
import { BookOpen, ListChecks, ReceiptText, Search, ShoppingBasket } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { formatDay } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { Empty, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Buscar" };

export default async function Buscar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const { supabase } = await requireMember();
  const like = `%${q.replace(/[%_,()]/g, " ")}%`;

  const [gastos, tareas, recetas, compra] = q
    ? await Promise.all([
        supabase.from("expenses").select("id,merchant,spent_on,amount_cents,notes").or(`merchant.ilike.${like},notes.ilike.${like}`).order("spent_on", { ascending: false }).limit(20),
        supabase.from("tasks").select("id,title,due_date,status").ilike("title", like).limit(20),
        supabase.from("recipes").select("id,name,servings").ilike("name", like).limit(20),
        supabase.from("shopping_items").select("id,name,checked").ilike("name", like).limit(20),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const total = (gastos.data?.length ?? 0) + (tareas.data?.length ?? 0) + (recetas.data?.length ?? 0) + (compra.data?.length ?? 0);

  return (
    <>
      <PageHeader title="Buscar" subtitle={q ? `${total} resultado${total === 1 ? "" : "s"} para «${q}»` : "Gastos, tareas, recetas y lista de la compra"} />
      <form className="glass mb-6 flex items-center gap-2 rounded-full px-4 py-2.5 md:hidden" role="search">
        <Search size={16} className="text-muted" />
        <input name="q" defaultValue={q} placeholder="Buscar…" className="w-full bg-transparent outline-none" type="search" aria-label="Buscar" />
      </form>
      {q && total === 0 && <Empty icon={<Search size={28} />} title="Sin resultados">Prueba con otra palabra.</Empty>}
      <div className="stagger">
        {!!gastos.data?.length && (
          <Section title="Gastos">
            <ul className="card divide-y divide-line p-0">
              {gastos.data.map((e) => (
                <li key={e.id}><Link href={`/gastos/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <ReceiptText size={16} className="text-muted" /><span className="flex-1 truncate">{e.merchant}</span>
                  <span className="text-xs text-muted">{formatDay(e.spent_on)}</span><span className="w-24 text-right font-medium">{formatEuros(e.amount_cents)}</span>
                </Link></li>
              ))}
            </ul>
          </Section>
        )}
        {!!tareas.data?.length && (
          <Section title="Tareas">
            <ul className="card divide-y divide-line p-0">
              {tareas.data.map((t) => (
                <li key={t.id}><Link href={`/tareas/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <ListChecks size={16} className="text-muted" /><span className={`flex-1 truncate ${t.status === "hecha" ? "text-muted line-through" : ""}`}>{t.title}</span>
                  {t.due_date && <span className="text-xs text-muted">{formatDay(t.due_date)}</span>}
                </Link></li>
              ))}
            </ul>
          </Section>
        )}
        {!!recetas.data?.length && (
          <Section title="Recetas">
            <ul className="card divide-y divide-line p-0">
              {recetas.data.map((r) => (
                <li key={r.id}><Link href={`/compras/recetas/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <BookOpen size={16} className="text-muted" /><span className="flex-1 truncate">{r.name}</span><span className="text-xs text-muted">{r.servings} raciones</span>
                </Link></li>
              ))}
            </ul>
          </Section>
        )}
        {!!compra.data?.length && (
          <Section title="Lista de la compra">
            <ul className="card divide-y divide-line p-0">
              {compra.data.map((i) => (
                <li key={i.id}><Link href="/compras" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <ShoppingBasket size={16} className="text-muted" /><span className={`flex-1 truncate ${i.checked ? "text-muted line-through" : ""}`}>{i.name}</span>
                </Link></li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}
