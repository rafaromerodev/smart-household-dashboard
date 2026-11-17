"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatEuros } from "@/lib/domain/money";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Importe que "cuenta" hasta su valor al aparecer (estilo Apple). */
export function AnimatedEuros({ cents, className }: { cents: number; className?: string }) {
  const [v, setV] = useState(cents);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setV(cents); return; }
    const start = performance.now();
    const a = from.current;
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      setV(Math.round(a + (cents - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = cents;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cents]);
  return <span className={className}>{formatEuros(v)}</span>;
}

// ---------------------------------------------------------------- Anillos

export interface RingDatum { label: string; value: number; detail: string; color: string }

/** Anillos concéntricos (estilo Actividad del Apple Watch). value = 0..1 (se permite >1: vuelta extra). */
export function Rings({ data, size = 168 }: { data: RingDatum[]; size?: number }) {
  const stroke = size * 0.1;
  const gap = stroke * 0.22;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label}: ${Math.round(d.value * 100)} %`).join(", ")} className="shrink-0 -rotate-90">
        {data.map((d, i) => {
          const r = size / 2 - stroke / 2 - i * (stroke + gap);
          const c = 2 * Math.PI * r;
          const v = Math.max(0, Math.min(d.value, 1.999));
          return (
            <g key={d.label}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeOpacity={0.18} strokeWidth={stroke} />
              {v > 0 && (
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${c * Math.min(v, 1)} ${c}`} className="ring-anim" style={{ ["--c" as string]: c, animationDelay: `${i * 120}ms` }} />
              )}
              {v > 1 && (
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeLinecap="round"
                  strokeDasharray={`${c * (v - 1)} ${c}`} style={{ filter: "drop-shadow(0 0 2px rgb(0 0 0 / .35))" }} />
              )}
            </g>
          );
        })}
      </svg>
      <ul className="min-w-0 space-y-2.5">
        {data.map((d) => (
          <li key={d.label}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <span className="size-2 rounded-full" style={{ background: d.color }} />{d.label}
            </div>
            <div className="text-sm font-semibold">{Math.round(d.value * 100)} % <span className="font-normal text-muted">· {d.detail}</span></div>
          </li>
        ))}
      </ul>
      <style>{`.ring-anim{animation:ring 1.3s var(--ease-spring) both}@keyframes ring{from{stroke-dasharray:0 var(--c)}}`}</style>
    </div>
  );
}

// ---------------------------------------------------------------- Donut

export interface Slice { key: string; label: string; value: number; color: string }

/** Donut de reparto con hueco entre segmentos, total en el centro, leyenda y resalte al pasar. */
export function Donut({ data, size = 168, centerLabel }: { data: Slice[]; size?: number; centerLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = data.reduce((a, d) => a + d.value, 0);
  const stroke = size * 0.13;
  const r = size / 2 - stroke / 2;
  const c = 2 * Math.PI * r;
  const gapLen = data.length > 1 ? 3 : 0;
  let offset = 0;
  const active = data.find((d) => d.key === hover);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={data.map((d) => `${d.label} ${formatEuros(d.value)}`).join(", ")}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
          {total > 0 && data.map((d, i) => {
            const len = (d.value / total) * c;
            const seg = (
              <circle key={d.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={hover === d.key ? stroke + 4 : stroke}
                strokeDasharray={`${Math.max(0, len - gapLen)} ${c}`} strokeDashoffset={-offset}
                onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}
                className="donut-seg cursor-pointer transition-[stroke-width,opacity] duration-300"
                style={{ opacity: hover && hover !== d.key ? 0.35 : 1, animationDelay: `${i * 70}ms` }} />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium text-muted">{active ? active.label : centerLabel}</span>
          <span className="text-lg font-semibold tracking-tight">{formatEuros(active ? active.value : total)}</span>
          {active && <span className="text-[11px] text-muted">{Math.round((active.value / total) * 100)} %</span>}
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1.5">
        {data.map((d) => (
          <li key={d.key} onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-sm transition ${hover === d.key ? "bg-surface-2" : ""}`}>
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate">{d.label}</span>
            <span className="text-xs text-muted">{total ? Math.round((d.value / total) * 100) : 0} %</span>
            <span className="w-20 text-right font-medium">{formatEuros(d.value)}</span>
          </li>
        ))}
      </ul>
      <style>{`.donut-seg{animation:seg 1.1s var(--ease-spring) both}@keyframes seg{from{stroke-dasharray:0 ${c}}}`}</style>
    </div>
  );
}

// ---------------------------------------------------------------- Área acumulada

export interface AreaSeries { label: string; values: (number | null)[]; color: string; dashed?: boolean }

/**
 * Gasto acumulado por día: serie principal con área degradada + serie de comparación
 * discontinua. Cruz de selección con tooltip al pasar o tocar. Un solo eje.
 */
export function AreaChart({ days, series, reference }: { days: string[]; series: AreaSeries[]; reference?: { label: string; value: number } }) {
  const W = 600, H = 180, P = 6;
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const max = Math.max(1, reference?.value ?? 0, ...series.flatMap((s) => s.values.map((v) => v ?? 0))) * 1.08;
  const x = (i: number) => (days.length <= 1 ? 0 : (i / (days.length - 1)) * W);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const paths = useMemo(() => series.map((s) => {
    const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)] as const)).filter((p): p is readonly [number, number] => p != null);
    if (!pts.length) return { line: "", area: "" };
    // Curva suave (Catmull-Rom → Bézier)
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x},${Math.min(H - P, c1y)} ${c2x},${Math.min(H - P, c2y)} ${p2[0]},${p2[1]}`;
    }
    return { line: d, area: `${d} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z` };
  }), [series, days.length, max]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const i = Math.round(((clientX - r.left) / r.width) * (days.length - 1));
    setIdx(Math.max(0, Math.min(days.length - 1, i)));
  };
  const tipLeft = idx == null ? 0 : (x(idx) / W) * 100;

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-3 text-xs text-muted">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "3 3" : undefined} /></svg>
              {s.label}
            </span>
          ))}
          {reference && <span className="flex items-center gap-1.5"><svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="var(--muted)" strokeWidth="1" strokeDasharray="1 3" /></svg>{reference.label}</span>}
        </div>
      )}
      <div ref={ref} className="relative h-44 touch-none select-none"
        onMouseMove={(e) => onMove(e.clientX)} onMouseLeave={() => setIdx(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)} onTouchMove={(e) => onMove(e.touches[0].clientX)} onTouchEnd={() => setIdx(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            {series.map((s, i) => (
              <linearGradient key={i} id={`ag${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {reference && reference.value > 0 && (
            <line x1="0" x2={W} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
          )}
          {paths.map((p, i) => !series[i].dashed && p.area && <path key={`a${i}`} d={p.area} fill={`url(#ag${i})`} className="fade-in" />)}
          {paths.map((p, i) => p.line && (
            <path key={`l${i}`} d={p.line} fill="none" stroke={series[i].color} strokeWidth={series[i].dashed ? 1.5 : 2.25}
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
              pathLength={series[i].dashed ? undefined : 1}
              strokeDasharray={series[i].dashed ? "4 5" : undefined}
              className={series[i].dashed ? "fade-in" : "draw"} opacity={series[i].dashed ? 0.7 : 1} />
          ))}
          {idx != null && <line x1={x(idx)} x2={x(idx)} y1="0" y2={H} stroke="var(--muted)" strokeOpacity="0.5" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {idx != null && series.map((s) => s.values[idx] != null && (
          <span key={s.label} className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
            style={{ left: `${tipLeft}%`, top: `${(y(s.values[idx]!) / H) * 100}%`, background: s.color }} />
        ))}
        {idx != null && (
          <div className="glass-strong pointer-events-none absolute top-0 z-10 rounded-xl px-2.5 py-1.5 text-xs"
            style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 60 ? "-105%" : "8px"})` }}>
            <div className="mb-0.5 font-medium">{days[idx]}</div>
            {series.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                <span className="text-muted">{s.label}</span>
                <span className="ml-auto pl-2 font-medium">{s.values[idx] == null ? "—" : formatEuros(s.values[idx]!)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{days[0]}</span><span>{days[Math.floor(days.length / 2)]}</span><span>{days[days.length - 1]}</span>
      </div>
    </div>
  );
}
