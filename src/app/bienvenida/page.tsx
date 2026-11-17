"use client";

import { startTransition, useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { setupHousehold } from "./actions";
import { signOut } from "../login/actions";

export default function Bienvenida() {
  const [modo, setModo] = useState<"crear" | "unirse">("crear");
  const [state, action, pending] = useActionState(setupHousehold, { ok: false });
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 safe-top">
    <div className="glass flex w-full max-w-sm flex-col gap-6 rounded-[2rem] p-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Te damos la bienvenida a Nuestro Hogar</h1>
        <p className="mt-1 text-sm text-muted">
          Una persona crea el hogar y comparte el código de invitación; la otra se une con ese código.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["crear", "unirse"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setModo(m)}
            className={`rounded-lg py-2 text-sm font-medium ${modo === m ? "bg-surface-strong shadow-sm" : "text-muted"}`}>
            {m === "crear" ? "Crear hogar" : "Tengo un código"}
          </button>
        ))}
      </div>
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}>
        <input type="hidden" name="modo" value={modo} />
        <label className="block">
          <span className="label">Tu nombre</span>
          <input className="field" name="nombre" required maxLength={40} placeholder="Cómo quieres aparecer" />
        </label>
        {modo === "crear" ? (
          <label className="block">
            <span className="label">Nombre del hogar</span>
            <input className="field" name="hogar" defaultValue="Nuestro hogar" maxLength={80} />
          </label>
        ) : (
          <label className="block">
            <span className="label">Código de invitación</span>
            <input className="field uppercase tracking-widest" name="codigo" required maxLength={20} autoCapitalize="characters" />
          </label>
        )}
        {state.error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? <><Loader2 size={16} className="animate-spin" />Un momento…</> : modo === "crear" ? "Crear hogar" : "Unirme"}
        </button>
      </form>
      <form action={signOut}><button className="w-full text-sm text-muted underline">Cerrar sesión</button></form>
    </div>
    </main>
  );
}
