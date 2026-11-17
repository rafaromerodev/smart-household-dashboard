import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { getCategories, getStores } from "@/lib/data";
import { todayISO } from "@/lib/domain/dates";
import { ActionButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { ExpenseForm } from "../expense-form";
import { deleteExpense, updateExpense } from "../actions";

export const metadata = { title: "Editar gasto" };

const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default async function EditExpense({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, me, members, household } = await requireMember();
  const { data: e } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();
  const [{ options }, stores, receipt] = await Promise.all([
    getCategories(supabase),
    getStores(supabase),
    e.receipt_id ? supabase.from("receipts").select("storage_path,mime_type").eq("id", e.receipt_id).single() : Promise.resolve({ data: null }),
  ]);
  // Enlace temporal (5 min) al justificante privado
  const signed = receipt.data
    ? (await supabase.storage.from("receipts").createSignedUrl(receipt.data.storage_path, 300)).data?.signedUrl
    : null;

  return (
    <>
      <Link href="/gastos" className="mb-2 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} />Gastos</Link>
      <PageHeader title="Editar gasto" action={
        <ActionButton action={deleteExpense.bind(null, e.id)} className="btn-danger" confirm="¿Eliminar este gasto y su justificante?" title="Eliminar">
          <Trash2 size={16} /> Eliminar
        </ActionButton>
      } />
      {signed && (
        <a href={signed} target="_blank" rel="noreferrer" className="card mb-4 flex items-center justify-between text-sm font-medium text-accent">
          Ver justificante adjunto <ExternalLink size={16} />
        </a>
      )}
      <div className="card">
        <ExpenseForm
          action={updateExpense.bind(null, e.id)}
          categories={options} stores={stores.map((s) => s.name)}
          members={members.map((m) => ({ id: m.id, display_name: m.display_name }))}
          meId={me.id} householdId={household.id} today={todayISO(household.timezone)}
          initial={{
            fecha: e.spent_on, importe: euros(e.amount_cents), establecimiento: e.merchant, categoria: e.category_id,
            ambito: e.scope, persona: e.member_id, medio_pago: e.payment_method,
            descuento: e.discount_cents ? euros(e.discount_cents) : "", notas: e.notes, justificante: e.receipt_id,
          }}
        />
      </div>
    </>
  );
}
