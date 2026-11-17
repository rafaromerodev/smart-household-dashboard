"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionForm, Sheet, SubmitButton } from "@/components/forms";
import { createWorkout, setWeeklyGoal } from "./actions";

export function NewWorkout({ members, meId, today, activities }: { members: { id: string; display_name: string }[]; meId: string; today: string; activities: string[] }) {
  return (
    <Sheet title="Añadir entrenamiento" openParam="entreno" trigger={<><Plus size={16} />Sesión</>}>
      {(close) => <Form members={members} meId={meId} today={today} activities={activities} onDone={close} />}
    </Sheet>
  );
}

function Form({ members, meId, today, activities, onDone }: { members: { id: string; display_name: string }[]; meId: string; today: string; activities: string[]; onDone: () => void }) {
  const [repeat, setRepeat] = useState(false);
  return (
    <ActionForm action={createWorkout} onDone={onDone}>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {members.map((m) => (
          <label key={m.id} className="relative">
            <input type="radio" name="persona" value={m.id} defaultChecked={m.id === meId} className="peer sr-only" />
            <span className="block rounded-lg py-2 text-center text-sm font-medium text-muted peer-checked:bg-surface-strong peer-checked:text-ink peer-checked:shadow-sm">{m.display_name}</span>
          </label>
        ))}
      </div>
      <label className="block"><span className="label">Actividad o clase</span>
        <input className="field" name="actividad" list="actividades" required maxLength={80} placeholder="Pilates, spinning, correr…" autoFocus />
        <datalist id="actividades">{activities.map((a) => <option key={a} value={a} />)}</datalist></label>
      {activities.length > 0 && (
        <div className="-mt-1 flex flex-wrap gap-1.5">
          {activities.slice(0, 6).map((a) => (
            <button key={a} type="button" className="chip min-h-7 text-xs"
              onClick={(e) => { const f = (e.currentTarget.closest("form")!.elements.namedItem("actividad") as HTMLInputElement); f.value = a; }}>{a}</button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-1 block"><span className="label">Fecha</span><input className="field px-2" type="date" name="fecha" required defaultValue={today} /></label>
        <label className="block"><span className="label">Hora</span><input className="field px-2" type="time" name="hora" required={repeat} /></label>
        <label className="block"><span className="label">Minutos</span><input className="field px-2" type="number" name="duracion" min={5} max={600} step={5} defaultValue={60} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="repetir" className="size-4" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> Se repite cada semana ese mismo día</label>
      {repeat ? (
        <label className="block"><span className="label">Hasta (opcional)</span><input className="field" type="date" name="hasta" /></label>
      ) : (
        <label className="block"><span className="label">Estado</span>
          <select className="field" name="estado" defaultValue="planificado">
            <option value="planificado">Planificado</option><option value="realizado">Realizado</option><option value="cancelado">Cancelado</option>
          </select></label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Lugar</span><input className="field" name="lugar" maxLength={80} placeholder="Opcional" /></label>
        {!repeat && <label className="block"><span className="label">Notas</span><input className="field" name="notas" maxLength={500} placeholder="Opcional" /></label>}
      </div>
      <SubmitButton>{repeat ? "Crear clase semanal" : "Guardar sesión"}</SubmitButton>
    </ActionForm>
  );
}

export function GoalForm({ current }: { current: number }) {
  return (
    <ActionForm action={setWeeklyGoal} resetOnSuccess={false} className="flex items-center gap-2">
      <span className="text-sm text-muted">Mi objetivo semanal:</span>
      <input className="field w-16 py-1.5 text-center" type="number" name="objetivo" min={0} max={21} defaultValue={current} aria-label="Sesiones por semana" />
      <SubmitButton className="btn-ghost min-h-9 px-3" pendingText="…">Guardar</SubmitButton>
    </ActionForm>
  );
}
