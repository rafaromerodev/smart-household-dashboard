import Link from "next/link";
import { BookOpen, Star } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { Badge, Empty } from "@/components/ui";
import { NewRecipe } from "./recipe-form";

export const metadata = { title: "Recetas" };

export default async function Recetas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireMember();
  let q = supabase.from("recipes").select("id,name,servings,tags,is_favorite,recipe_ingredients(count)").order("is_favorite", { ascending: false }).order("name");
  if (sp.q) q = q.ilike("name", `%${sp.q.replace(/[%_]/g, "")}%`);
  const { data: recipes } = await q;

  return (
    <>
      <div className="mb-4 flex gap-2">
        <form className="flex-1"><input className="field" name="q" defaultValue={sp.q} placeholder="Buscar receta…" type="search" /></form>
        <NewRecipe />
      </div>
      {(recipes ?? []).length === 0 ? (
        <Empty icon={<BookOpen size={28} />} title={sp.q ? "Sin resultados" : "Vuestra biblioteca está vacía"}>
          Guardad aquí las recetas que repetís: luego podréis ponerlas en el menú y generar la lista automáticamente.
        </Empty>
      ) : (
        <ul className="card divide-y divide-line p-0">
          {(recipes ?? []).map((r) => (
            <li key={r.id}>
              <Link href={`/compras/recetas/${r.id}`} className="flex items-center gap-3 px-4 py-3">
                {r.is_favorite ? <Star size={16} className="shrink-0 fill-current text-warn" /> : <span className="w-4" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted">{r.servings} raciones · {(r.recipe_ingredients as unknown as { count: number }[])[0]?.count ?? 0} ingredientes</div>
                </div>
                <div className="hidden gap-1 sm:flex">{r.tags.slice(0, 3).map((t) => <Badge key={t}>{t}</Badge>)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
