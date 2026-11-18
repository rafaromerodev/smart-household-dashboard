import { Suspense } from "react";
import { BottomNav, SideNav } from "@/components/nav";
import { TopBar } from "@/components/topbar";
import { NavProgress } from "@/components/nav-progress";
import { requireMember } from "@/lib/supabase/server";
import { demo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, household, members } = await requireMember();
  const [{ count: tareas }, { count: compras }] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "hecha"),
    supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("checked", false),
  ]);
  return (
    <div className="flex min-h-dvh">
      <SideNav householdName={household.name} badges={{ tareas: tareas ?? 0, compras: compras ?? 0 }} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-32 md:px-8 md:pt-6 md:pb-10 lg:max-w-6xl">
        {demo && (
          <p className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-center text-xs text-muted">
            Demo con datos ficticios · los cambios se borran cada día
          </p>
        )}
        <Suspense><TopBar members={members.map((m) => ({ id: m.id, display_name: m.display_name, color: m.color }))} /></Suspense>
        {children}
      </main>
      <BottomNav />
      <Suspense><NavProgress /></Suspense>
    </div>
  );
}
