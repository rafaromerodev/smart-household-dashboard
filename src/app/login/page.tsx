"use client";

import { startTransition, useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { authenticate } from "./actions";
import { demo } from "@/lib/demo";

export default function LoginPage() {
  const [mode, setMode] = useState<"entrar" | "registro">("entrar");
  const [state, action, pending] = useActionState(authenticate, { ok: false });

  return (
    <main className="flex min-h-dvh items-center justify-center p-4 safe-top">
    <div className="glass flex w-full max-w-sm flex-col gap-6 rounded-[2rem] p-7">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-accent-ink">NH</div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuestro Hogar</h1>
        <p className="mt-1 text-sm text-muted">Compras, gastos, ahorro, entrenamientos y tareas.</p>
      </div>

      {demo && (
        <div className="card space-y-2 text-sm">
          <p><b>Demo pública</b> con datos ficticios. Se restablece cada día.</p>
          <p className="text-muted">Email: {demo.email}<br />Contraseña: {demo.password}</p>
          <button type="button" disabled={pending} className="btn-primary w-full" onClick={() => {
            if (!demo) return;
            const fd = new FormData();
            fd.set("mode", "entrar");
            fd.set("email", demo.email);
            fd.set("password", demo.password);
            startTransition(() => action(fd));
          }}>
            Entrar en la demo
          </button>
        </div>
      )}

      {!demo && (
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["entrar", "registro"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-medium ${mode === m ? "bg-surface-strong shadow-sm" : "text-muted"}`}>
            {m === "entrar" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>
      )}

      {state.ok ? (
        <p className="card text-center text-sm">
          Te hemos enviado un email de confirmación. Ábrelo, confirma la cuenta y vuelve aquí para entrar.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={(e) => {
          // Sin reseteo automático de React 19: si la contraseña falla, el email se conserva.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}>
          <input type="hidden" name="mode" value={mode} />
          <label className="block">
            <span className="label">Email</span>
            <input className="field" name="email" type="email" autoComplete="email" inputMode="email" required />
          </label>
          <label className="block">
            <span className="label">Contraseña</span>
            <input className="field" name="password" type="password" minLength={8} required
              autoComplete={mode === "entrar" ? "current-password" : "new-password"} />
          </label>
          {state.error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <><Loader2 size={16} className="animate-spin" />Un momento…</> : mode === "entrar" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
      )}
    </div>
    </main>
  );
}
