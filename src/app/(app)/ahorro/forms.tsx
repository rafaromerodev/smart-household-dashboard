"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Settings2, Plus } from "lucide-react";
import { ActionForm, Sheet, SubmitButton } from "@/components/forms";
import type { ActionResult } from "@/lib/actions";
import { createMovement, setMonthlyTarget, createGoal } from "./actions";

type Goal = { id: string; name: string };
type Member = { id: string; display_name: string };

export interface MovementInitial {
  tipo: "deposit" | "withdrawal"; objetivo: string; fecha: string; importe: string;
  concepto: string | null; motivo: string | null; persona: string | null;
}

export function MovementForm({ action, goals, members, meId, today, initial, onDone, defaultKind = "deposit" }: {
  action: (p: ActionResult, fd: FormData) => Promise<ActionResult>; goals: Goal[]; members: Member[]; meId: string; today: string;
  initial?: MovementInitial; onDone?: () => void; defaultKind?: "deposit" | "withdrawal";
}) {
  const [kind, setKind] = useState(initial?.tipo ?? defaultKind);
  return (
    <ActionForm action={action} onDone={onDone}>
      <input type="hidden" name="tipo" value={kind} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        <button type="button" onClick={() => setKind("deposit")} className={`rounded-lg py-2 text-sm font-medium ${kind === "deposit" ? "bg-surface-strong text-ok shadow-sm" : "text-muted"}`}>Aportación</button>
        <button type="button" onClick={() => setKind("withdrawal")} className={`rounded-lg py-2 text-sm font-medium ${kind === "withdrawal" ? "bg-surface-strong text-danger shadow-sm" : "text-muted"}`}>Retirada</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Importe (€)</span>
          <input className="field text-lg font-semibold" name="importe" inputMode="decimal" required placeholder="0,00" defaultValue={initial?.importe} /></label>
        <label className="block"><span className="label">Fecha</span>
          <input className="field" type="date" name="fecha" required defaultValue={initial?.fecha ?? today} /></label>
      </div>
      {goals.length > 1 ? (
        <label className="block"><span className="label">Hucha</span>
          <select className="field" name="objetivo" defaultValue={initial?.objetivo ?? goals[0]?.id}>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select></label>
      ) : <input type="hidden" name="objetivo" value={goals[0]?.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="label">Concepto</span>
          <input className="field" name="concepto" maxLength={140} defaultValue={initial?.concepto ?? ""} placeholder="Opcional" /></label>
        <label className="block"><span className="label">Persona</span>
          <select className="field" name="persona" defaultValue={initial?.persona ?? meId}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select></label>
      </div>
      {kind === "withdrawal" && (
        <label className="block"><span className="label">Motivo de la retirada</span>
          <input className="field" name="motivo" required maxLength={280} defaultValue={initial?.motivo ?? ""} /></label>
      )}
      <p className="text-xs text-muted">Es dinero que apartáis de verdad. No cuenta como gasto ni se suma a otros «ahorros».</p>
      <SubmitButton>{initial ? "Guardar cambios" : kind === "deposit" ? "Registrar aportación" : "Registrar retirada"}</SubmitButton>
    </ActionForm>
  );
}

export function SavingsActions(p: { goals: Goal[]; members: Member[]; meId: string; today: string; currentMonth: string; target: { min: string; max: string } | null; monthlyGoalId: string }) {
  return (
    <div className="mb-6 grid grid-cols-3 gap-2">
      <Sheet title="Nueva aportación" openParam="aportacion" triggerClassName="btn-primary" trigger={<><ArrowDownToLine size={16} />Aportar</>}>
        {(close) => <MovementForm action={createMovement} {...p} onDone={close} />}
      </Sheet>
      <Sheet title="Retirada" openParam="retirada" triggerClassName="btn-ghost" trigger={<><ArrowUpFromLine size={16} />Retirar</>}>
        {(close) => <MovementForm action={createMovement} {...p} onDone={close} defaultKind="withdrawal" />}
      </Sheet>
      <Sheet title="Meta mensual" triggerClassName="btn-ghost" trigger={<><Settings2 size={16} />Meta</>}>
        {(close) => (
          <ActionForm action={setMonthlyTarget} onDone={close} resetOnSuccess={false}>
            <input type="hidden" name="objetivo" value={p.monthlyGoalId} />
            <p className="text-sm text-muted">Puede ser una cifra exacta (deja el máximo vacío) o un rango, como 20–30 €. El cambio se aplica desde el mes indicado; los meses anteriores conservan su meta.</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="label">Mínimo (€)</span>
                <input className="field" name="minimo" inputMode="decimal" required defaultValue={p.target?.min} /></label>
              <label className="block"><span className="label">Máximo (€)</span>
                <input className="field" name="maximo" inputMode="decimal" defaultValue={p.target?.max} /></label>
            </div>
            <label className="block"><span className="label">Desde el mes</span>
              <input className="field" type="month" name="desde" required defaultValue={p.currentMonth} /></label>
            <SubmitButton>Guardar meta</SubmitButton>
          </ActionForm>
        )}
      </Sheet>
    </div>
  );
}

export function NewGoal() {
  return (
    <Sheet title="Nuevo objetivo" triggerClassName="text-xs font-medium text-accent flex items-center gap-1" trigger={<><Plus size={14} />Objetivo</>}>
      {(close) => (
        <ActionForm action={createGoal} onDone={close}>
          <label className="block"><span className="label">Nombre</span><input className="field" name="nombre" required maxLength={80} placeholder="Viaje, fondo de emergencia…" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label">Meta (€)</span><input className="field" name="meta" inputMode="decimal" required /></label>
            <label className="block"><span className="label">Fecha objetivo</span><input className="field" type="date" name="fecha" /></label>
          </div>
          <SubmitButton>Crear objetivo</SubmitButton>
        </ActionForm>
      )}
    </Sheet>
  );
}
