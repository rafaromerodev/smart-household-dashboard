"use client";

import { Plus } from "lucide-react";
import { ActionForm, Sheet, SubmitButton } from "@/components/forms";
import { addMeal } from "../actions";

export function AddMeal({ date, label, recipes }: { date: string; label: string; recipes: { id: string; name: string }[] }) {
  return (
    <Sheet title={`Plato · ${label}`} triggerClassName="rounded-full p-1.5 text-accent hover:bg-accent-soft" trigger={<Plus size={18} aria-label={`Añadir plato el ${label}`} />}>
      {(close) => (
        <ActionForm action={addMeal} onDone={close}>
          <input type="hidden" name="fecha" value={date} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Momento</span>
              <select className="field" name="comida" defaultValue="comida">
                <option value="desayuno">Desayuno</option><option value="comida">Comida</option><option value="cena">Cena</option>
              </select></label>
            <label className="block"><span className="label">Raciones</span>
              <input className="field" type="number" name="raciones" min={1} max={20} defaultValue={2} /></label>
          </div>
          {recipes.length > 0 && (
            <label className="block"><span className="label">Receta de vuestra biblioteca</span>
              <select className="field" name="receta" defaultValue="">
                <option value="">— Ninguna —</option>
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></label>
          )}
          <label className="block"><span className="label">{recipes.length ? "…o escribe el plato" : "Plato"}</span>
            <input className="field" name="titulo" maxLength={120} placeholder="Lentejas, ensalada…" /></label>
          <SubmitButton>Añadir al menú</SubmitButton>
        </ActionForm>
      )}
    </Sheet>
  );
}
