import { Refrigerator, Trash2 } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { addDays, formatDay, todayISO } from "@/lib/domain/dates";
import { ActionButton } from "@/components/forms";
import { Badge, Empty, Section } from "@/components/ui";
import { InlineForm } from "@/components/inline-form";
import { addPantryItem, deletePantryItem, updatePantryQty } from "../actions";

export const metadata = { title: "En casa" };

const PLACES = { nevera: "Nevera", congelador: "Congelador", despensa: "Despensa", otro: "Otro" } as const;

export default async function Despensa() {
  const { supabase, household } = await requireMember();
  const today = todayISO(household.timezone);
  const soon = addDays(today, 3);
  const { data: items } = await supabase.from("inventory_items").select("*").order("expires_on", { nullsFirst: false }).order("name");

  return (
    <>
      <p className="mb-3 text-sm text-muted">Lo que tenéis en casa. Se descuenta al generar la lista desde el menú y avisa de lo que caduca pronto.</p>
      <div className="card mb-4">
        <InlineForm action={addPantryItem} submit="Añadir">
          <input className="field min-w-0 flex-[2_1_10rem]" name="nombre" placeholder="Producto" required maxLength={120} />
          <input className="field w-20" name="cantidad" inputMode="decimal" placeholder="Cant." />
          <input className="field w-20" name="unidad" placeholder="ud/g/l" maxLength={20} />
          <select className="field w-32" name="ubicacion" defaultValue="nevera">
            {Object.entries(PLACES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-muted">Caduca<input className="field w-40" type="date" name="caduca" /></label>
        </InlineForm>
      </div>

      {(items ?? []).length === 0 ? (
        <Empty icon={<Refrigerator size={28} />} title="Nada registrado">Apuntad lo que queda en la nevera y la despensa para no comprarlo dos veces.</Empty>
      ) : (
        Object.entries(PLACES).map(([k, label]) => {
          const list = (items ?? []).filter((i) => (i.location ?? "otro") === k);
          if (!list.length) return null;
          return (
            <Section key={k} title={label}>
              <ul className="card divide-y divide-line p-0">
                {list.map((i) => {
                  const expired = i.expires_on && i.expires_on < today;
                  const risky = i.expires_on && !expired && i.expires_on <= soon;
                  return (
                    <li key={i.id} className="flex items-center gap-2 px-4 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{i.name}</div>
                        {i.expires_on && <div className="text-xs text-muted">Caduca {formatDay(i.expires_on)}</div>}
                      </div>
                      {expired && <Badge tone="danger">Caducado</Badge>}
                      {risky && <Badge tone="warn">Pronto</Badge>}
                      <div className="w-28"><InlineForm action={updatePantryQty.bind(null, i.id)} submit="✓" compact>
                        <input className="field w-14 px-2 py-1.5 text-sm" name="cantidad" inputMode="decimal" defaultValue={i.quantity ?? ""} aria-label="Cantidad" />
                      </InlineForm></div>
                      <span className="w-6 text-xs text-muted">{i.unit}</span>
                      <ActionButton action={deletePantryItem.bind(null, i.id)} className="rounded p-1 text-muted" title="Quitar"><Trash2 size={15} /></ActionButton>
                    </li>
                  );
                })}
              </ul>
            </Section>
          );
        })
      )}
    </>
  );
}
