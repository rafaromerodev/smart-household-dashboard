"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { ActionForm, Sheet, SubmitButton } from "@/components/forms";
import type { ActionResult } from "@/lib/actions";
import { createTask } from "./actions";

export interface TaskInitial {
  titulo: string; descripcion: string; responsable: string; fecha: string; prioridad: string; estado: string; categoria: string; repeticion: string;
}

const TEMPLATES = [
  { titulo: "Preparar el menú semanal", categoria: "Compras", repeticion: "weekly" },
  { titulo: "Revisar la nevera", categoria: "Compras", repeticion: "weekly" },
  { titulo: "Hacer la compra", categoria: "Compras", repeticion: "weekly" },
];

export function TaskForm({ action, members, initial, onDone, today, categories }: {
  action: (p: ActionResult, fd: FormData) => Promise<ActionResult>; members: { id: string; display_name: string }[];
  initial?: TaskInitial; onDone?: () => void; today: string; categories: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fill = (t: (typeof TEMPLATES)[number]) => {
    const f = ref.current!.closest("form")!;
    (f.elements.namedItem("titulo") as HTMLInputElement).value = t.titulo;
    (f.elements.namedItem("categoria") as HTMLInputElement).value = t.categoria;
    (f.elements.namedItem("repeticion") as HTMLSelectElement).value = t.repeticion;
    const d = f.elements.namedItem("fecha") as HTMLInputElement;
    if (!d.value) d.value = today;
  };
  return (
    <ActionForm action={action} onDone={onDone}>
      <div ref={ref} />
      {!initial && (
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => <button key={t.titulo} type="button" className="chip min-h-7 text-xs" onClick={() => fill(t)}>{t.titulo}</button>)}
        </div>
      )}
      <label className="block"><span className="label">Tarea</span>
        <input className="field" name="titulo" required maxLength={140} defaultValue={initial?.titulo} autoFocus={!initial} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Responsable</span>
          <select className="field" name="responsable" defaultValue={initial?.responsable ?? ""}>
            <option value="">Los dos</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select></label>
        <label className="block"><span className="label">Fecha límite</span>
          <input className="field" type="date" name="fecha" defaultValue={initial?.fecha} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Prioridad</span>
          <select className="field" name="prioridad" defaultValue={initial?.prioridad ?? "media"}>
            <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
          </select></label>
        <label className="block"><span className="label">Se repite</span>
          <select className="field" name="repeticion" defaultValue={initial?.repeticion ?? "none"}>
            <option value="none">No</option><option value="daily">Cada día</option><option value="weekly">Cada semana</option><option value="monthly">Cada mes</option>
          </select></label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Categoría</span>
          <input className="field" name="categoria" list="cat-tareas" maxLength={40} defaultValue={initial?.categoria} placeholder="Casa, papeles…" />
          <datalist id="cat-tareas">{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
        <label className="block"><span className="label">Estado</span>
          <select className="field" name="estado" defaultValue={initial?.estado ?? "pendiente"}>
            <option value="pendiente">Pendiente</option><option value="en_curso">En curso</option><option value="hecha">Hecha</option>
          </select></label>
      </div>
      <label className="block"><span className="label">Descripción</span>
        <textarea className="field" name="descripcion" rows={2} maxLength={2000} defaultValue={initial?.descripcion} /></label>
      <SubmitButton>{initial ? "Guardar cambios" : "Crear tarea"}</SubmitButton>
    </ActionForm>
  );
}

export function NewTask(p: { members: { id: string; display_name: string }[]; today: string; categories: string[] }) {
  return (
    <Sheet title="Nueva tarea" openParam="tarea" trigger={<><Plus size={16} />Tarea</>}>
      {(close) => <TaskForm action={createTask} onDone={close} {...p} />}
    </Sheet>
  );
}
