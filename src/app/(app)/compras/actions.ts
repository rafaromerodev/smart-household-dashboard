"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/supabase/server";
import { type ActionResult, OK, dbError, fail, parseForm, zDate, zOptDate, zOptNumber, zOptText, zOptUuid, zText, zUuid } from "@/lib/actions";
import { buildNeeds, normalizeName, parseIngredientLine } from "@/lib/domain/shopping";
import { addDays } from "@/lib/domain/dates";

const done = () => { revalidatePath("/", "layout"); return OK; };

// ------------------------------------------------------------ lista de la compra

async function activeListId() {
  const { supabase } = await requireMember();
  const { data } = await supabase.from("shopping_lists").select("id").eq("status", "activa").order("created_at").limit(1).maybeSingle();
  if (data) return data.id;
  const { data: created, error } = await supabase.from("shopping_lists").insert({ name: "Compra semanal" }).select("id").single();
  if (error) throw error;
  return created.id;
}

const ItemSchema = z.object({ texto: zText(120) });

/** Añade un producto escribiendo "2 l leche" o simplemente "leche". */
export async function addItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(ItemSchema, fd);
  if ("error" in p) return fail(p.error);
  const ing = parseIngredientLine(p.data.texto)!;
  const { supabase } = await requireMember();
  const list_id = await activeListId();
  const { error } = await supabase.from("shopping_items").insert({ list_id, name: ing.name, quantity: ing.quantity, unit: ing.quantity != null ? ing.unit : null });
  return error ? dbError(error) : done();
}

export async function toggleItem(id: string, checked: boolean): Promise<ActionResult> {
  const { supabase, me } = await requireMember();
  const { error } = await supabase.from("shopping_items").update({ checked, checked_by: checked ? me.id : null }).eq("id", id);
  return error ? dbError(error) : done();
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  return error ? dbError(error) : done();
}

export async function clearChecked(): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const list_id = await activeListId();
  const { error } = await supabase.from("shopping_items").delete().eq("list_id", list_id).eq("checked", true);
  return error ? dbError(error) : done();
}

// ------------------------------------------------------------ menú semanal

const MealSchema = z.object({
  fecha: zDate,
  comida: z.enum(["desayuno", "comida", "cena"]),
  receta: zOptUuid,
  titulo: zOptText(120),
  raciones: z.coerce.number().int().min(1).max(20).default(2),
});

export async function addMeal(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(MealSchema, fd);
  if ("error" in p) return fail(p.error);
  const { supabase } = await requireMember();
  let title = p.data.titulo;
  if (p.data.receta) {
    const { data } = await supabase.from("recipes").select("name").eq("id", p.data.receta).single();
    title = title ?? data?.name ?? null;
  }
  if (!title) return fail("Escribe un plato o elige una receta");
  const { error } = await supabase.from("meal_plan").insert({
    plan_date: p.data.fecha, meal: p.data.comida, recipe_id: p.data.receta, title, servings: p.data.raciones,
  });
  return error ? dbError(error) : done();
}

export async function deleteMeal(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("meal_plan").delete().eq("id", id);
  return error ? dbError(error) : done();
}

/** Copia el menú de la semana anterior a la semana indicada. */
export async function copyPreviousWeek(weekStart: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const prev = addDays(weekStart, -7);
  const { data } = await supabase.from("meal_plan").select("*").gte("plan_date", prev).lte("plan_date", addDays(prev, 6));
  if (!data?.length) return fail("La semana anterior no tiene menú");
  const { error } = await supabase.from("meal_plan").insert(
    data.map((m) => ({ plan_date: addDays(m.plan_date, 7), meal: m.meal, recipe_id: m.recipe_id, title: m.title, servings: m.servings, notes: m.notes })),
  );
  return error ? dbError(error) : done();
}

/**
 * Genera la lista de la compra desde el menú de la semana: agrega ingredientes
 * repetidos, descuenta la despensa y no duplica lo que ya está pendiente en la lista.
 */
export async function generateFromMenu(weekStart: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const needs = await weekNeeds(weekStart);
  if (needs == null) return fail("No hay recetas con ingredientes en el menú de esta semana");
  const list_id = await activeListId();
  const { data: current } = await supabase.from("shopping_items").select("name").eq("list_id", list_id).eq("checked", false);
  const already = new Set((current ?? []).map((i) => normalizeName(i.name)));
  const rows = needs
    .filter((n) => !n.covered && !already.has(normalizeName(n.name)))
    .map((n) => ({ list_id, name: n.name, quantity: n.toBuy, unit: n.toBuy != null ? n.unit : null, source: "menu" as const, notes: n.usedIn.join(", ") }));
  if (!rows.length) return fail("Todo lo necesario ya está en la lista o en casa");
  const { error } = await supabase.from("shopping_items").insert(rows);
  return error ? dbError(error) : done();
}

export async function weekNeeds(weekStart: string) {
  const { supabase } = await requireMember();
  const { data: meals } = await supabase.from("meal_plan").select("title,servings,recipe_id")
    .gte("plan_date", weekStart).lte("plan_date", addDays(weekStart, 6)).not("recipe_id", "is", null);
  const ids = [...new Set((meals ?? []).map((m) => m.recipe_id!))];
  if (!ids.length) return null;
  const [{ data: recipes }, { data: ings }, { data: inv }] = await Promise.all([
    supabase.from("recipes").select("id,servings").in("id", ids),
    supabase.from("recipe_ingredients").select("recipe_id,name,quantity,unit").in("recipe_id", ids),
    supabase.from("inventory_items").select("name,quantity,unit"),
  ]);
  const servings = new Map((recipes ?? []).map((r) => [r.id, r.servings]));
  const planned = (meals ?? []).map((m) => ({
    title: m.title, servings: m.servings, recipeServings: servings.get(m.recipe_id!) ?? m.servings,
    ingredients: (ings ?? []).filter((i) => i.recipe_id === m.recipe_id).map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
  }));
  if (!planned.some((p) => p.ingredients.length)) return null;
  return buildNeeds(planned, inv ?? []);
}

// ------------------------------------------------------------ recetas

const RecipeSchema = z.object({
  nombre: zText(120),
  raciones: z.coerce.number().int().min(1).max(20).default(2),
  ingredientes: z.string().max(5000).default(""),
  preparacion: zOptText(10000),
  etiquetas: z.string().max(200).default(""),
  favorita: z.string().optional(),
});

function parseRecipe(fd: FormData) {
  const p = parseForm(RecipeSchema, fd);
  if ("error" in p) return { error: p.error };
  const ingredients = p.data.ingredientes.split(/\r?\n/).map(parseIngredientLine).filter((x) => x != null);
  return {
    recipe: {
      name: p.data.nombre, servings: p.data.raciones, instructions: p.data.preparacion,
      tags: p.data.etiquetas.split(",").map((t) => t.trim()).filter(Boolean), is_favorite: p.data.favorita === "on",
    },
    ingredients,
  };
}

export async function createRecipe(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = parseRecipe(fd);
  if (!r.recipe) return fail(r.error!);
  const { supabase } = await requireMember();
  const { data, error } = await supabase.from("recipes").insert(r.recipe).select("id").single();
  if (error) return dbError(error);
  if (r.ingredients.length) {
    const { error: e2 } = await supabase.from("recipe_ingredients").insert(r.ingredients.map((i, n) => ({ ...i, recipe_id: data.id, sort_order: n })));
    if (e2) return dbError(e2);
  }
  return done();
}

export async function updateRecipe(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const r = parseRecipe(fd);
  if (!r.recipe) return fail(r.error!);
  const { supabase } = await requireMember();
  const { error } = await supabase.from("recipes").update(r.recipe).eq("id", id);
  if (error) return dbError(error);
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
  if (r.ingredients.length) {
    const { error: e2 } = await supabase.from("recipe_ingredients").insert(r.ingredients.map((i, n) => ({ ...i, recipe_id: id, sort_order: n })));
    if (e2) return dbError(e2);
  }
  revalidatePath("/", "layout");
  redirect("/compras/recetas");
}

export async function deleteRecipe(id: string): Promise<ActionResult> {
  const { supabase } = await requireMember();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  redirect("/compras/recetas");
}

// ------------------------------------------------------------ despensa (inventario)

const PantrySchema = z.object({
  nombre: zText(120),
  cantidad: zOptNumber,
  unidad: zOptText(20),
  ubicacion: z.enum(["nevera", "congelador", "despensa", "otro"]).default("despensa"),
  caduca: zOptDate,
});

export async function addPantryItem(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(PantrySchema, fd);
  if ("error" in p) return fail(p.error);
  const { supabase } = await requireMember();
  const { error } = await supabase.from("inventory_items").insert({
    name: p.data.nombre, quantity: p.data.cantidad, unit: p.data.unidad, location: p.data.ubicacion, expires_on: p.data.caduca,
  });
  return error ? dbError(error) : done();
}

export async function updatePantryQty(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(z.object({ cantidad: zOptNumber }), fd);
  if ("error" in p) return fail(p.error);
  const { supabase } = await requireMember();
  const { error } = await supabase.from("inventory_items").update({ quantity: p.data.cantidad, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? dbError(error) : done();
}

export async function deletePantryItem(id: string): Promise<ActionResult> {
  if (!zUuid.safeParse(id).success) return fail("No válido");
  const { supabase } = await requireMember();
  const { error } = await supabase.from("inventory_items").delete().eq("id", id);
  return error ? dbError(error) : done();
}
