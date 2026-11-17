"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBasket, ReceiptText, PiggyBank, LayoutGrid, Dumbbell, ListChecks, CalendarDays, Settings, Search } from "lucide-react";

const MAIN = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/compras", label: "Compras", icon: ShoppingBasket },
  { href: "/gastos", label: "Gastos", icon: ReceiptText },
  { href: "/ahorro", label: "Ahorro", icon: PiggyBank },
  { href: "/mas", label: "Más", icon: LayoutGrid },
];
const MORE_PATHS = ["/mas", "/calendario", "/entrenamientos", "/tareas", "/buscar"];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/mas") return MORE_PATHS.some((p) => path.startsWith(p));
  return path.startsWith(href);
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 rounded-[1.75rem] md:hidden" style={{ marginBottom: "env(safe-area-inset-bottom)" }} aria-label="Principal">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {MAIN.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors ${active ? "text-accent" : "text-muted"}`}>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-all duration-500 ${active ? "bg-accent-soft" : ""}`} style={{ transitionTimingFunction: "var(--ease-spring)" }}>
                  <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type Item = { href: string; label: string; icon: typeof Home; badge?: number };

export function SideNav({ householdName, badges }: { householdName: string; badges: { tareas: number; compras: number } }) {
  const path = usePathname();
  const sections: { title: string; items: Item[] }[] = [
    { title: "General", items: [
      { href: "/", label: "Inicio", icon: Home },
      { href: "/compras", label: "Compras", icon: ShoppingBasket, badge: badges.compras },
      { href: "/gastos", label: "Gastos", icon: ReceiptText },
      { href: "/ahorro", label: "Ahorro", icon: PiggyBank },
    ] },
    { title: "Hogar", items: [
      { href: "/calendario", label: "Calendario", icon: CalendarDays },
      { href: "/entrenamientos", label: "Entrenamientos", icon: Dumbbell },
      { href: "/tareas", label: "Tareas", icon: ListChecks, badge: badges.tareas },
    ] },
    { title: "Cuenta", items: [
      { href: "/buscar", label: "Buscar", icon: Search },
      { href: "/mas", label: "Ajustes", icon: Settings },
    ] },
  ];
  return (
    <aside className="glass sticky top-4 m-4 mr-0 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 flex-col rounded-[2rem] p-4 md:flex">
      <div className="mb-6 flex items-center gap-3 px-2 pt-1">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-[#1d5a42] text-xs font-bold text-white shadow-[0_8px_18px_-8px_var(--accent)]">NH</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{householdName}</div>
          <div className="text-xs text-muted">Nuestro Hogar</div>
        </div>
      </div>
      <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto" aria-label="Principal">
        {sections.map((s) => (
          <div key={s.title}>
            <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{s.title}</div>
            {s.items.map(({ href, label, icon: Icon, badge }) => {
              const active = href === "/mas" ? path === "/mas" : isActive(path, href);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${active ? "bg-surface-strong text-ink shadow-[0_4px_14px_-6px_rgb(0_0_0/0.18)]" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                  <Icon size={18} className={active ? "text-accent" : ""} />
                  <span className="flex-1">{label}</span>
                  {!!badge && <span className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold ${active ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted"}`}>{badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
