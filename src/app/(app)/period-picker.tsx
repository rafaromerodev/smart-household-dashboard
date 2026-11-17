"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PeriodKind } from "@/lib/domain/dates";
import { Segmented } from "@/components/segmented";

const OPTS: { k: PeriodKind; label: string }[] = [
  { k: "week", label: "Semana" },
  { k: "month", label: "Mes" },
  { k: "year", label: "Año" },
  { k: "custom", label: "Rango" },
];

export function PeriodPicker({ kind, from, to }: { kind: PeriodKind; from: string; to: string }) {
  const router = useRouter();
  const [custom, setCustom] = useState(kind === "custom");
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  return (
    <div>
      <Segmented size="sm" className="w-full sm:w-80" active={custom ? "custom" : kind}
        options={OPTS.map((o) => ({
          key: o.k, label: o.label,
          onClick: () => { if (o.k === "custom") setCustom(true); else { setCustom(false); router.push(`/?p=${o.k}`, { scroll: false }); } },
        }))} />
      {custom && (
        <form className="mt-2 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (f && t && f <= t) router.push(`/?p=custom&desde=${f}&hasta=${t}`, { scroll: false }); }}>
          <label className="flex-1"><span className="label text-xs">Desde</span><input type="date" className="field py-2" value={f} onChange={(e) => setF(e.target.value)} required /></label>
          <label className="flex-1"><span className="label text-xs">Hasta</span><input type="date" className="field py-2" value={t} min={f} onChange={(e) => setT(e.target.value)} required /></label>
          <button className="btn-primary">Ver</button>
        </form>
      )}
    </div>
  );
}
