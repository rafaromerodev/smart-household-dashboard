import Link from "next/link";
import { Archive, ArchiveRestore, ChevronLeft, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { getCategories } from "@/lib/data";
import { ActionButton } from "@/components/forms";
import { PageHeader, Section, Badge } from "@/components/ui";
import { createCategory, deleteCategory, renameCategory, toggleArchiveCategory } from "../actions";
import { InlineForm } from "@/components/inline-form";

export const metadata = { title: "Categorías" };

export default async function Categorias() {
  const { supabase } = await requireMember();
  const { cats, roots } = await getCategories(supabase, true);

  return (
    <>
      <Link href="/gastos" className="mb-2 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} />Gastos</Link>
      <PageHeader title="Categorías" subtitle="Edita nombres y colores, añade subcategorías o archiva las que no uses." />

      <Section title="Nueva categoría">
        <div className="card">
          <InlineForm action={createCategory} submit="Añadir">
            <input className="field flex-1" name="nombre" placeholder="Nombre" required maxLength={60} />
            <select className="field w-40" name="padre" defaultValue="">
              <option value="">Principal</option>
              {roots.map((r) => <option key={r.id} value={r.id}>Dentro de {r.name}</option>)}
            </select>
            <input type="color" name="color" defaultValue="#94a3b8" className="h-11 w-11 shrink-0 rounded-xl border border-line bg-surface-strong" aria-label="Color" />
          </InlineForm>
        </div>
      </Section>

      <div className="space-y-3">
        {roots.map((r) => {
          const subs = cats.filter((c) => c.parent_id === r.id);
          return (
            <div key={r.id} className="card space-y-2">
              <Row c={r} />
              {subs.length > 0 && (
                <div className="ml-4 space-y-2 border-l border-line pl-3">
                  {subs.map((s) => <Row key={s.id} c={s} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Row({ c }: { c: { id: string; name: string; color: string; archived: boolean } }) {
  return (
    <div className={`flex items-center gap-2 ${c.archived ? "opacity-60" : ""}`}>
      <InlineForm action={renameCategory.bind(null, c.id)} submit="✓" compact>
        <input type="color" name="color" defaultValue={c.color} className="h-9 w-9 shrink-0 rounded-lg border border-line bg-surface-strong" aria-label="Color" />
        <input className="field flex-1 py-1.5" name="nombre" defaultValue={c.name} required maxLength={60} aria-label="Nombre" />
      </InlineForm>
      {c.archived && <Badge>Archivada</Badge>}
      <ActionButton action={toggleArchiveCategory.bind(null, c.id, !c.archived)} className="rounded-lg p-2 text-muted hover:bg-surface-2" title={c.archived ? "Restaurar" : "Archivar"}>
        {c.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      </ActionButton>
      <ActionButton action={deleteCategory.bind(null, c.id)} className="rounded-lg p-2 text-danger hover:bg-danger-soft" confirm={`¿Eliminar «${c.name}»?`} title="Eliminar">
        <Trash2 size={16} />
      </ActionButton>
    </div>
  );
}
