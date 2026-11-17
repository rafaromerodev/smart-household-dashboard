"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Efecto de carga entre pantallas: barra fina con brillo arriba y el contenido
 * se atenúa con un ligero desenfoque hasta que llega la pantalla nueva.
 * (Sustituye a loading.tsx, que en Next 15 bloqueaba el cierre de formularios
 * tras guardar.)
 */
export function NavProgress() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, params]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setLoading(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    document.body.toggleAttribute("data-navigating", loading);
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 10_000); // por si la navegación se cancela
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden transition-opacity duration-300 ${loading ? "opacity-100" : "opacity-0"}`}>
      <div className="nav-progress h-full w-full" />
    </div>
  );
}
