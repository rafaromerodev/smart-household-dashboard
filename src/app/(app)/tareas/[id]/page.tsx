import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { todayISO } from "@/lib/domain/dates";
import { ActionButton } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { TaskForm } from "../task-form";
import { deleteTask, updateTask } from "../actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Editar tarea" };

export default async function EditTask({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, members, household } = await requireMember();
  const { data: t } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();
  async function remove() {
    "use server";
    const r = await deleteTask(id);
    if (r.ok) redirect("/tareas");
    return r;
  }
  return (
    <>
      <Link href="/tareas" className="mb-2 inline-flex items-center gap-1 text-sm text-muted"><ChevronLeft size={16} />Tareas</Link>
      <PageHeader title="Editar tarea" action={<ActionButton action={remove} className="btn-danger" confirm="¿Eliminar esta tarea?"><Trash2 size={16} />Eliminar</ActionButton>} />
      <div className="card">
        <TaskForm action={updateTask.bind(null, t.id)} members={members.map((m) => ({ id: m.id, display_name: m.display_name }))} today={todayISO(household.timezone)} categories={[]}
          initial={{
            titulo: t.title, descripcion: t.description ?? "", responsable: t.assignee_id ?? "", fecha: t.due_date ?? "",
            prioridad: t.priority, estado: t.status, categoria: t.category ?? "", repeticion: t.recurrence,
          }} />
      </div>
    </>
  );
}
