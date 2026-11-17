"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/** Barra superior (escritorio): buscador global, fecha y hora en vivo y los miembros del hogar. */
export function TopBar({ members }: { members: { id: string; display_name: string; color: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  const time = now?.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const date = now?.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="mb-6 hidden items-center gap-3 md:flex">
      <form className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2 shadow-none" role="search"
        onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q")?.toString().trim(); if (q) router.push(`/buscar?q=${encodeURIComponent(q)}`); }}>
        <Search size={16} className="text-muted" />
        <input name="q" defaultValue={params.get("q") ?? ""} placeholder="Buscar gastos, tareas, recetas, productos…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" aria-label="Buscar" />
        <kbd className="hidden rounded-md bg-surface-2 px-1.5 text-[11px] text-muted lg:block">Intro</kbd>
      </form>
      <div className="glass rounded-full px-4 py-2 text-sm font-medium tabular-nums shadow-none" suppressHydrationWarning>
        {now ? <><span className="text-muted">{date} · </span>{time}</> : " "}
      </div>
      <div className="flex -space-x-2">
        {members.map((m) => (
          <span key={m.id} title={m.display_name}
            className="flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white ring-2 ring-white/80"
            style={{ background: m.color }}>{m.display_name.slice(0, 1).toUpperCase()}</span>
        ))}
      </div>
    </div>
  );
}
