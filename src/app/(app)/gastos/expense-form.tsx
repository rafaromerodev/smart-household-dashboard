"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { ReceiptPicker } from "@/components/receipt-picker";
import type { ActionResult } from "@/lib/actions";

export interface ExpenseFormProps {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  categories: { id: string; label: string; parent_id: string | null }[];
  stores: string[];
  members: { id: string; display_name: string }[];
  meId: string;
  householdId: string;
  today: string;
  initial?: {
    fecha: string; importe: string; establecimiento: string; categoria: string | null;
    ambito: string; persona: string | null; medio_pago: string | null; descuento: string; notas: string | null;
    justificante: string | null;
  };
  highlightCamera?: boolean;
  onDone?: () => void;
}

export function ExpenseForm(p: ExpenseFormProps) {
  const i = p.initial;
  const [more, setMore] = useState(Boolean(i?.notas || i?.medio_pago || (i && i.descuento !== "")));
  return (
    <ActionForm action={p.action} onDone={p.onDone}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Importe (€)</span>
          <input className="field text-lg font-semibold" name="importe" inputMode="decimal" required placeholder="0,00"
            defaultValue={i?.importe} autoFocus={!i && !p.highlightCamera} />
        </label>
        <label className="block">
          <span className="label">Fecha</span>
          <input className="field" type="date" name="fecha" required defaultValue={i?.fecha ?? p.today} />
        </label>
      </div>
      <label className="block">
        <span className="label">Establecimiento o destinatario</span>
        <input className="field" name="establecimiento" list="tiendas" required maxLength={120} defaultValue={i?.establecimiento} placeholder="Mercadona, farmacia, gasolinera…" />
        <datalist id="tiendas">{p.stores.map((s) => <option key={s} value={s} />)}</datalist>
      </label>
      <label className="block">
        <span className="label">Categoría</span>
        <select className="field" name="categoria" defaultValue={i?.categoria ?? ""}>
          <option value="">Sin categoría</option>
          {p.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.parent_id ? "   " : ""}{c.label}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Tipo</span>
          <select className="field" name="ambito" defaultValue={i?.ambito ?? "shared"}>
            <option value="shared">Compartido</option>
            <option value="personal">Personal</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Pagado por</span>
          <select className="field" name="persona" defaultValue={i?.persona ?? p.meId}>
            {p.members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </label>
      </div>

      {i?.justificante ? (
        <input type="hidden" name="justificante" value={i.justificante} />
      ) : (
        <ReceiptPicker householdId={p.householdId} highlight={p.highlightCamera} />
      )}

      {more ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Medio de pago</span>
              <input className="field" name="medio_pago" list="medios" maxLength={40} defaultValue={i?.medio_pago ?? ""} />
              <datalist id="medios"><option value="Tarjeta" /><option value="Efectivo" /><option value="Bizum" /><option value="Transferencia" /></datalist>
            </label>
            <label className="block">
              <span className="label">Descuento aplicado (€)</span>
              <input className="field" name="descuento" inputMode="decimal" placeholder="0,00" defaultValue={i?.descuento} />
            </label>
          </div>
          <p className="-mt-1 text-xs text-muted">El importe es lo pagado finalmente; el descuento es informativo y no se vuelve a restar.</p>
          <label className="block">
            <span className="label">Notas</span>
            <textarea className="field" name="notas" rows={2} maxLength={1000} defaultValue={i?.notas ?? ""} />
          </label>
        </>
      ) : (
        <button type="button" className="text-sm font-medium text-accent" onClick={() => setMore(true)}>+ Medio de pago, descuento y notas</button>
      )}
      <SubmitButton>{i ? "Guardar cambios" : "Añadir gasto"}</SubmitButton>
    </ActionForm>
  );
}
