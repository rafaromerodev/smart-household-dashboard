"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus } from "lucide-react";

const WALLS = [
  { key: "salvia", label: "Salvia", colors: ["#a8d8bf", "#ffd2b0", "#c3c8ff"] },
  { key: "amanecer", label: "Amanecer", colors: ["#ffc3a8", "#ffb3c7", "#ffe29a"] },
  { key: "oceano", label: "Océano", colors: ["#9fd4ff", "#a3f0e0", "#b9b5ff"] },
  { key: "lavanda", label: "Lavanda", colors: ["#d5c2ff", "#ffc6e6", "#b8d4ff"] },
];

/** Elige el fondo de la app. Se guarda en ESTE dispositivo (cada uno puede tener el suyo). */
export function WallpaperPicker() {
  const [current, setCurrent] = useState("salvia");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setCurrent(localStorage.getItem("ar-wall") ?? "salvia");
      setPhoto(localStorage.getItem("ar-wall-img"));
    } catch {}
  }, []);

  function apply(key: string, img?: string | null) {
    const root = document.documentElement;
    if (key === "salvia") delete root.dataset.wall;
    else root.dataset.wall = key;
    if (key === "foto" && img) root.style.setProperty("--wall-img", `url(${img})`);
    try { localStorage.setItem("ar-wall", key); } catch {}
    setCurrent(key);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setError(null);
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.8);
      localStorage.setItem("ar-wall-img", data);
      setPhoto(data);
      apply("foto", data);
    } catch {
      setError("No se pudo usar esa imagen (puede que sea demasiado grande).");
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {WALLS.map((w) => (
          <button key={w.key} type="button" onClick={() => apply(w.key)} className="group text-center" aria-pressed={current === w.key}>
            <span className={`relative block aspect-[4/3] overflow-hidden rounded-2xl ring-2 transition ${current === w.key ? "ring-accent" : "ring-transparent group-hover:ring-line"}`}
              style={{ background: `radial-gradient(60% 70% at 20% 20%, ${w.colors[0]}, transparent 70%), radial-gradient(60% 70% at 85% 25%, ${w.colors[1]}, transparent 70%), radial-gradient(70% 70% at 60% 100%, ${w.colors[2]}, transparent 70%), #f2f2f0` }}>
              {current === w.key && <span className="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-ink"><Check size={12} strokeWidth={3} /></span>}
            </span>
            <span className="mt-1 block text-xs font-medium">{w.label}</span>
          </button>
        ))}
        <button type="button" onClick={() => (photo && current !== "foto" ? apply("foto", photo) : input.current?.click())} className="group text-center" aria-pressed={current === "foto"}>
          <span className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-surface-2 bg-cover bg-center ring-2 transition ${current === "foto" ? "ring-accent" : "ring-transparent group-hover:ring-line"}`}
            style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
            {!photo && <ImagePlus size={20} className="text-muted" />}
            {current === "foto" && <span className="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-ink"><Check size={12} strokeWidth={3} /></span>}
          </span>
          <span className="mt-1 block text-xs font-medium">Tu foto</span>
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {photo && <button type="button" onClick={() => input.current?.click()} className="mt-3 text-xs font-medium text-accent">Cambiar foto</button>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      <p className="mt-2 text-xs text-muted">El fondo se guarda en este dispositivo: cada uno puede tener el suyo.</p>
    </div>
  );
}
