import Link from "next/link";
import { CalendarDays, ChevronRight, Dumbbell, ListChecks, LogOut, Share, SquarePlus, Store } from "lucide-react";
import { requireMember } from "@/lib/supabase/server";
import { getStores } from "@/lib/data";
import { InlineForm } from "@/components/inline-form";
import { Badge, PageHeader, Section } from "@/components/ui";
import { signOut } from "@/app/login/actions";
import { renameHousehold, updateProfile } from "./actions";
import { WallpaperPicker } from "@/components/wallpaper-picker";

export const metadata = { title: "Más" };

const MODULES = [
  { href: "/calendario", label: "Calendario", desc: "Entrenamientos, tareas y menú juntos", icon: CalendarDays },
  { href: "/entrenamientos", label: "Entrenamientos", desc: "Clases, objetivo semanal y asistencia", icon: Dumbbell },
  { href: "/tareas", label: "Tareas", desc: "Pendientes compartidas e individuales", icon: ListChecks },
];

export default async function Mas() {
  const { supabase, me, members, household, user } = await requireMember();
  const stores = await getStores(supabase);
  return (
    <>
      <PageHeader title="Ajustes y más" />
      <ul className="card mb-6 divide-y divide-line p-0">
        {MODULES.map(({ href, label, desc, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={18} /></span>
              <div className="flex-1"><div className="font-medium">{label}</div><div className="text-xs text-muted">{desc}</div></div>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <Section title="Fondo de pantalla">
        <div className="card"><WallpaperPicker /></div>
      </Section>

      <Section title="Hogar">
        <div className="card space-y-4">
          <InlineForm action={renameHousehold} submit="Guardar" compact>
            <input className="field flex-1" name="hogar" defaultValue={household.name} aria-label="Nombre del hogar" maxLength={80} />
          </InlineForm>
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className="size-3 rounded-full" style={{ background: m.color }} /> {m.display_name} {m.id === me.id && <Badge>tú</Badge>}
              </div>
            ))}
          </div>
          {members.length < 2 && (
            <div className="rounded-xl bg-accent-soft p-3 text-sm">
              <p className="font-medium text-accent">Invita a tu pareja</p>
              <p className="mt-1 text-muted">Que cree su cuenta en la app y, en «Tengo un código», escriba:</p>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.3em]">{household.invite_code}</p>
            </div>
          )}
        </div>
      </Section>

      <Section title="Mi perfil">
        <div className="card space-y-2">
          <p className="text-xs text-muted">{user.email}</p>
          <InlineForm action={updateProfile} submit="Guardar" compact>
            <input type="color" name="color" defaultValue={me.color} className="h-11 w-11 shrink-0 rounded-xl border border-line bg-surface-strong" aria-label="Mi color" />
            <input className="field flex-1" name="nombre" defaultValue={me.display_name} maxLength={40} aria-label="Mi nombre" />
          </InlineForm>
        </div>
      </Section>

      <Section title="Supermercados">
        <ul className="card divide-y divide-line p-0">
          {stores.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Store size={16} className="text-muted" />
              <div className="flex-1">
                <div className="font-medium">{s.name}</div>
                {Number(s.employee_discount_pct) > 0 && <div className="text-xs text-muted">Descuento de empleado {Number(s.employee_discount_pct)} % · {s.discount_confirmed ? "condiciones confirmadas" : "condiciones pendientes de confirmar"}</div>}
              </div>
              {Number(s.employee_discount_pct) > 0 && !s.discount_confirmed && <Badge tone="warn">Sin confirmar</Badge>}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">La configuración del descuento (artículos elegibles, exclusiones, límites) y la comparación de cestas llegan en la 2ª entrega. Hasta confirmarlo, el descuento no se aplica a ningún cálculo.</p>
      </Section>

      <Section title="Instalar en el iPhone">
        <ol className="card list-decimal space-y-1 pl-8 text-sm">
          <li>Abre esta web en <b>Safari</b>.</li>
          <li>Pulsa <Share size={14} className="inline" /> <b>Compartir</b>.</li>
          <li>Elige <SquarePlus size={14} className="inline" /> <b>Añadir a pantalla de inicio</b> y confirma.</li>
        </ol>
      </Section>

      <form action={signOut}><button className="btn-ghost w-full"><LogOut size={16} />Cerrar sesión</button></form>
    </>
  );
}
