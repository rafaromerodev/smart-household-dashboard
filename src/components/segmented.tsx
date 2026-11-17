"use client";

import Link from "next/link";

/**
 * Control segmentado al estilo iOS: la pastilla blanca se desliza con efecto muelle
 * hasta la opción activa. Cada opción puede ser un enlace o un botón.
 */
export function Segmented({ options, active, className = "", size = "md" }: {
  options: { key: string; label: string; href?: string; onClick?: () => void }[];
  active: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const n = options.length;
  const i = Math.max(0, options.findIndex((o) => o.key === active));
  const pad = size === "sm" ? "py-1.5 text-[13px]" : "py-2 text-sm";
  return (
    <div className={`relative grid rounded-full bg-surface-2 p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} role="tablist">
      <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-full bg-surface-strong shadow-[0_2px_8px_-2px_rgb(0_0_0/0.15)] transition-transform duration-500"
        style={{ width: `calc((100% - 0.5rem) / ${n})`, transform: `translateX(${i * 100}%)`, transitionTimingFunction: "var(--ease-spring)" }} />
      {options.map((o) => {
        const cls = `relative z-10 rounded-full px-2 text-center font-medium transition-colors duration-300 ${pad} ${o.key === active ? "text-ink" : "text-muted hover:text-ink"}`;
        return o.href ? (
          <Link key={o.key} href={o.href} scroll={false} role="tab" aria-selected={o.key === active} aria-current={o.key === active ? "page" : undefined} className={cls}>{o.label}</Link>
        ) : (
          <button key={o.key} type="button" role="tab" aria-selected={o.key === active} onClick={o.onClick} className={cls}>{o.label}</button>
        );
      })}
    </div>
  );
}
