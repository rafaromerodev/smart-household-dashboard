"use client";

import { Plus } from "lucide-react";
import { ActionForm, Sheet, SubmitButton } from "@/components/forms";
import type { ActionResult } from "@/lib/actions";
import { createRecipe } from "../actions";

export interface RecipeInitial { nombre: string; raciones: number; ingredientes: string; preparacion: string; etiquetas: string; favorita: boolean }

export function RecipeForm({ action, initial, onDone }: { action: (p: ActionResult, fd: FormData) => Promise<ActionResult>; initial?: RecipeInitial; onDone?: () => void }) {
  return (
    <ActionForm action={action} onDone={onDone}>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <label className="block"><span className="label">Nombre</span><input className="field" name="nombre" required maxLength={120} defaultValue={initial?.nombre} /></label>
        <label className="block"><span className="label">Raciones</span><input className="field" type="number" name="raciones" min={1} max={20} defaultValue={initial?.raciones ?? 2} /></label>
      </div>
      <label className="block"><span className="label">Ingredientes (uno por línea)</span>
        <textarea className="field font-mono text-sm" name="ingredientes" rows={6} defaultValue={initial?.ingredientes} placeholder={"200 g arroz\n2 huevos\n1 l caldo\nsal"} /></label>
      <label className="block"><span className="label">Preparación</span>
        <textarea className="field" name="preparacion" rows={4} defaultValue={initial?.preparacion} /></label>
      <label className="block"><span className="label">Etiquetas (separadas por comas)</span>
        <input className="field" name="etiquetas" defaultValue={initial?.etiquetas} placeholder="rápida, legumbres, tupper" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="favorita" defaultChecked={initial?.favorita} className="size-4" /> Receta frecuente</label>
      <SubmitButton>{initial ? "Guardar receta" : "Crear receta"}</SubmitButton>
    </ActionForm>
  );
}

export function NewRecipe() {
  return (
    <Sheet title="Nueva receta" openParam="receta" trigger={<><Plus size={16} />Receta</>}>
      {(close) => <RecipeForm action={createRecipe} onDone={close} />}
    </Sheet>
  );
}
