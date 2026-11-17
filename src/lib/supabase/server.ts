import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: el middleware ya refresca la sesión.
          }
        },
      },
    },
  );
}

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Household = Database["public"]["Tables"]["households"]["Row"];

/**
 * Sesión + miembro + hogar del usuario actual. Redirige a /login o /bienvenida
 * si falta algo. Cacheado por petición.
 */
export const requireMember = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: me } = await supabase.from("members").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (!me) redirect("/bienvenida");
  const [{ data: household }, { data: members }] = await Promise.all([
    supabase.from("households").select("*").eq("id", me.household_id).single(),
    supabase.from("members").select("*").order("created_at"),
  ]);
  return { supabase, user: auth.user, me, household: household!, members: members ?? [] };
});
