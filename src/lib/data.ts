import "server-only";
import type { Database } from "./supabase/database.types";
import type { createClient } from "./supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Category = Tables<"categories">;

export interface CategoryOption { id: string; label: string; parent_id: string | null; color: string }

/** Categorías activas ordenadas como árbol (padre seguido de sus subcategorías). */
export async function getCategories(db: DB, includeArchived = false) {
  let q = db.from("categories").select("*").order("sort_order").order("name");
  if (!includeArchived) q = q.eq("archived", false);
  const { data } = await q;
  const cats = data ?? [];
  const roots = cats.filter((c) => !c.parent_id);
  const options: CategoryOption[] = [];
  for (const r of roots) {
    options.push({ id: r.id, label: r.name, parent_id: null, color: r.color });
    for (const s of cats.filter((c) => c.parent_id === r.id))
      options.push({ id: s.id, label: `${r.name} › ${s.name}`, parent_id: r.id, color: s.color });
  }
  return { cats, roots, options };
}

export async function getStores(db: DB) {
  const { data } = await db.from("stores").select("*").order("name");
  return data ?? [];
}
