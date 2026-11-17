import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { todayISO } from "@/lib/domain/dates";
import { PageHeader } from "@/components/ui";
import { MovementForm } from "../forms";
import { updateMovement } from "../actions";

export const metadata = { title: "Editar movimiento" };

export default async function EditMovement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me, members, household } = await requireMember();
  const [{ data: m }, { data: goals }] = await Promise.all([
    supabase.from("savings_movements").select("*").eq("id", id).maybeSingle(),
    supabase.from("savings_goals").select("id,name").eq("archived", false).order("created_at"),
  ]);
  if (!m) notFound();
  return (
    <>
      <Link href="/ahorro" className="mb-2 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} />Ahorro</Link>
      <PageHeader title="Editar movimiento" />
      <div className="card">
        <MovementForm
          action={updateMovement.bind(null, m.id)} goals={goals ?? []}
          members={members.map((x) => ({ id: x.id, display_name: x.display_name }))} meId={me.id} today={todayISO(household.timezone)}
          initial={{
            tipo: m.kind as "deposit" | "withdrawal", objetivo: m.goal_id, fecha: m.occurred_on,
            importe: (m.amount_cents / 100).toFixed(2).replace(".", ","), concepto: m.concept, motivo: m.reason, persona: m.member_id,
          }}
        />
      </div>
    </>
  );
}
