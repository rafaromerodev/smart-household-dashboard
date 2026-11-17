"use client";

import { useRef, useState } from "react";
import { Camera, FileUp, Loader2, Paperclip, X } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Selector de justificante (foto con la cámara, galería o PDF).
 * Sube el archivo DIRECTAMENTE al bucket privado de Supabase (evita límites de
 * tamaño de las funciones del servidor), detecta tickets ya subidos por su huella
 * SHA-256 y deja el id del justificante en un campo oculto del formulario.
 * Las fotos se reducen a 2000 px en JPEG para ahorrar espacio.
 */
// Nota iOS: Safari no permite abrir la cámara sin un toque del usuario, por eso
// el acceso rápido "Fotografiar ticket" abre el formulario con este botón destacado.
export function ReceiptPicker({ householdId, highlight = false }: { householdId: string; highlight?: boolean }) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ status: "idle" | "uploading" | "done" | "error"; msg?: string; id?: string; name?: string }>({ status: "idle" });

  async function handle(file: File | undefined) {
    if (!file) return;
    setState({ status: "uploading" });
    try {
      const original = await file.arrayBuffer();
      const hash = toHex(await crypto.subtle.digest("SHA-256", original));
      const db = getBrowserClient();

      const { data: existing } = await db.from("receipts").select("id").eq("sha256", hash).maybeSingle();
      if (existing) {
        setState({ status: "error", msg: "Este justificante ya se había subido antes. Revisa si el gasto ya está registrado." });
        return;
      }

      const isPdf = file.type === "application/pdf";
      const blob = isPdf ? file : await downscale(file).catch(() => file);
      const ext = isPdf ? "pdf" : blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() ?? "img").toLowerCase();
      const path = `${householdId}/${crypto.randomUUID()}.${ext}`;
      const up = await db.storage.from("receipts").upload(path, blob, { contentType: blob.type || file.type, upsert: false });
      if (up.error) throw up.error;

      const { data, error } = await db.from("receipts")
        .insert({ storage_path: path, mime_type: blob.type || file.type, size_bytes: blob.size, sha256: hash })
        .select("id").single();
      if (error) {
        await db.storage.from("receipts").remove([path]);
        throw error;
      }
      setState({ status: "done", id: data.id, name: file.name || "Foto del ticket" });
    } catch (e) {
      setState({ status: "error", msg: e instanceof Error ? e.message : "No se pudo subir el archivo" });
    }
  }

  return (
    <div>
      <span className="label">Justificante</span>
      <input type="hidden" name="justificante" value={state.id ?? ""} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handle(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => handle(e.target.files?.[0])} />

      {state.status === "done" ? (
        <div className="flex items-center justify-between rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
          <span className="flex items-center gap-2 truncate"><Paperclip size={16} /> {state.name}</span>
          <button type="button" aria-label="Quitar" onClick={() => setState({ status: "idle" })}><X size={16} /></button>
        </div>
      ) : state.status === "uploading" ? (
        <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted"><Loader2 size={16} className="animate-spin" /> Subiendo…</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={highlight ? "btn-primary" : "btn-ghost"} onClick={() => camRef.current?.click()}>
            <Camera size={16} /> Hacer foto
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}><FileUp size={16} /> Imagen o PDF</button>
        </div>
      )}
      {state.status === "error" && <p role="alert" className="mt-1 text-xs text-danger">{state.msg}</p>}
    </div>
  );
}

function toHex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function downscale(file: File, max = 2000): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.85));
}
