import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { ActionButton } from "@/components/forms";
import { RecipeForm } from "../recipe-form";
import { deleteRecipe, updateRecipe } from "../../actions";

export const metadata = { title: "Receta" };

const fmtIng = (i: { name: string; quantity: number | null; unit: string | null }) =>
  i.quantity == null ? i.name : `${Number(i.quantity).toLocaleString("es-ES")} ${i.unit && i.unit !== "ud" ? i.unit + " " : ""}${i.name}`;

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireMember();
  const [{ data: r }, { data: ings }] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).maybeSingle(),
    supabase.from("recipe_ingredients").select("*").eq("recipe_id", id).order("sort_order"),
  ]);
  if (!r) notFound();
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Link href="/compras/recetas" className="inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} />Recetas</Link>
        <ActionButton action={deleteRecipe.bind(null, r.id)} className="btn-danger min-h-9" confirm={`¿Eliminar la receta «${r.name}»?`}><Trash2 size={15} />Eliminar</ActionButton>
      </div>
      <div className="card">
        <RecipeForm action={updateRecipe.bind(null, r.id)} initial={{
          nombre: r.name, raciones: r.servings, ingredientes: (ings ?? []).map((i) => fmtIng({ ...i, quantity: i.quantity == null ? null : Number(i.quantity) })).join("\n"),
          preparacion: r.instructions ?? "", etiquetas: r.tags.join(", "), favorita: r.is_favorite,
        }} />
      </div>
    </>
  );
}
