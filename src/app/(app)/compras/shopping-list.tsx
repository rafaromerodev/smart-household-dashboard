"use client";

import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, ShoppingBasket } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { ActionForm, ActionButton, SubmitButton } from "@/components/forms";
import { addItem, clearChecked, deleteItem, toggleItem } from "./actions";

export interface Item {
  id: string; name: string; quantity: number | null; unit: string | null; checked: boolean; source: string; notes: string | null; checked_by: string | null;
}

const qty = (i: Item) => (i.quantity != null ? `${Number(i.quantity).toLocaleString("es-ES")} ${i.unit ?? ""}`.trim() : "");

export function ShoppingList({ items, members, focus = false }: { items: Item[]; members: Record<string, { name: string; color: string }>; focus?: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [optimistic, setOpt] = useOptimistic(items, (state, u: { id: string; checked: boolean }) =>
    state.map((i) => (i.id === u.id ? { ...i, checked: u.checked } : i)),
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronización en vivo: cuando la otra persona marca o añade algo, se refresca.
  useEffect(() => {
    const db = getBrowserClient();
    const ch = db.channel("shopping_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 300);
      })
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [router]);

  const pending = optimistic.filter((i) => !i.checked);
  const checked = optimistic.filter((i) => i.checked);

  const toggle = (i: Item) => start(async () => {
    setOpt({ id: i.id, checked: !i.checked });
    await toggleItem(i.id, !i.checked);
  });

  return (
    <div>
      <ActionForm action={addItem} className="mb-4 flex gap-2">
        <input className="field flex-1" name="texto" placeholder="Añadir: «2 l leche», «pan»…" required maxLength={120} autoComplete="off" enterKeyHint="done" autoFocus={focus} />
        <SubmitButton className="btn-primary px-3" pendingText="…"><Plus size={18} /><span className="sr-only">Añadir</span></SubmitButton>
      </ActionForm>

      {optimistic.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-8 text-center">
          <ShoppingBasket size={28} className="text-muted" />
          <p className="font-medium">La lista está vacía</p>
          <p className="max-w-xs text-sm text-muted">Añade productos arriba o genera la lista desde el menú de la semana.</p>
        </div>
      ) : (
        <>
          <ul className="card divide-y divide-line p-0">
            {pending.map((i) => <Row key={i.id} i={i} onToggle={() => toggle(i)} />)}
            {pending.length === 0 && <li className="px-4 py-3 text-sm text-muted">¡Todo comprado!</li>}
          </ul>
          {checked.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-medium text-muted">En el carro ({checked.length})</span>
                <ActionButton action={clearChecked} className="text-xs font-medium text-accent" confirm="¿Quitar de la lista los productos ya comprados?">Quitar comprados</ActionButton>
              </div>
              <ul className="card divide-y divide-line p-0 opacity-70">
                {checked.map((i) => <Row key={i.id} i={i} onToggle={() => toggle(i)} who={i.checked_by ? members[i.checked_by] : undefined} />)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ i, onToggle, who }: { i: Item; onToggle: () => void; who?: { name: string; color: string } }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <button type="button" onClick={onToggle} aria-label={i.checked ? "Desmarcar" : "Marcar como comprado"}
        className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${i.checked ? "border-accent bg-accent text-accent-ink" : "border-line"}`}>
        {i.checked && <Check size={16} strokeWidth={3} />}
      </button>
      <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
        <div className={`truncate ${i.checked ? "line-through" : "font-medium"}`}>{i.name}</div>
        {(qty(i) || i.notes || who) && (
          <div className="truncate text-xs text-muted">
            {[qty(i), i.source === "menu" && i.notes ? `para: ${i.notes}` : i.notes, who ? `cogido por ${who.name}` : null].filter(Boolean).join(" · ")}
          </div>
        )}
      </button>
      <ActionButton action={deleteItem.bind(null, i.id)} className="rounded-lg p-1.5 text-muted" title="Eliminar"><Trash2 size={15} /></ActionButton>
    </li>
  );
}
