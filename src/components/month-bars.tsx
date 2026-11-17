import { formatEuros } from "@/lib/domain/money";

export interface MonthBar {
  key: string;     // YYYY-MM
  label: string;   // "ene"
  value: number;   // céntimos (puede ser negativo)
  min?: number | null;
  max?: number | null;
}

/**
 * Barras mensuales de una sola serie con la meta como franja de referencia.
 * Sin dependencias: HTML + CSS. Tooltip al pasar el ratón o al enfocar (táctil: tocar).
 * Incluye vista de tabla accesible.
 */
export function MonthBars({ data, title }: { data: MonthBar[]; title: string }) {
  const top = Math.max(1, ...data.map((d) => Math.max(d.value, d.max ?? 0)));
  const h = (v: number) => `${(Math.max(0, v) / top) * 100}%`;
  return (
    <figure>
      <figcaption className="sr-only">{title}</figcaption>
      <div className="relative h-36">
        {/* cuadrícula discreta */}
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line/70" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-0.5">
          {data.map((d) => (
            <div key={d.key} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none">
              {d.min != null && d.max != null && (
                <div className="absolute inset-x-0 bg-accent/10" style={{ bottom: h(d.min), height: `calc(${h(d.max)} - ${h(d.min)})`, minHeight: 2 }} />
              )}
              <div className="relative w-[60%] max-w-6 rounded-t bg-accent group-hover:opacity-80 group-focus:opacity-80" style={{ height: h(d.value), minHeight: d.value > 0 ? 2 : 0 }} />
              <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap glass-strong rounded-lg px-2 py-1 text-xs group-hover:block group-focus:block">
                <div className="font-medium">{d.label}</div>
                <div>{formatEuros(d.value)}</div>
                {d.min != null && <div className="text-muted">Meta {d.min === d.max ? formatEuros(d.min) : `${formatEuros(d.min)}–${formatEuros(d.max ?? d.min)}`}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-0.5 text-center text-[10px] text-muted">
        {data.map((d) => <div key={d.key} className="flex-1">{d.label.slice(0, 1)}</div>)}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted">Ver como tabla</summary>
        <table className="mt-2 w-full">
          <thead><tr className="text-left text-muted"><th className="font-medium">Mes</th><th className="text-right font-medium">Neto</th><th className="text-right font-medium">Meta</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-line">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right">{formatEuros(d.value)}</td>
                <td className="py-1 text-right text-muted">{d.min != null ? (d.min === d.max ? formatEuros(d.min) : `${formatEuros(d.min)}–${formatEuros(d.max ?? d.min)}`) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
