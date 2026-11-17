"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

// Estado "enviando" de ActionForm (que no usa la prop action nativa, ver abajo).
const PendingCtx = createContext(false);
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Loader2, X } from "lucide-react";
import type { ActionResult } from "@/lib/actions";

export function SubmitButton({ children, className = "btn-primary w-full", pendingText = "Guardando…" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingCtx);
  const pending = status.pending || ctxPending;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (<><Loader2 size={16} className="animate-spin" />{pendingText}</>) : children}
    </button>
  );
}

type Action = (prev: ActionResult, fd: FormData) => Promise<ActionResult>;

/**
 * Formulario conectado a una Server Action. Muestra errores de validación,
 * estado de carga y llama a onDone cuando la acción termina bien.
 */
export function ActionForm({
  action, children, onDone, className = "space-y-3", resetOnSuccess = true,
}: { action: Action; children: ReactNode; onDone?: () => void; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      done.current?.();
    } else if (state.error || state.needsConfirm) {
      msgRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [state, resetOnSuccess]);
  // Se envía con onSubmit en vez de <form action>: React 19 vacía el formulario tras
  // cada envío con action, y con un error de validación se perderían los datos escritos.
  return (
    <form ref={ref} className={className} onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(() => formAction(fd));
    }}>
      <PendingCtx.Provider value={pending}>{children}</PendingCtx.Provider>
      <div ref={msgRef} />
      {state.needsConfirm && (
        <label className="flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          <input type="checkbox" name="confirmado" value="1" className="mt-1" />
          <span>{state.needsConfirm}</span>
        </label>
      )}
      {state.error && !state.needsConfirm && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
    </form>
  );
}

/** Botón que ejecuta una acción sencilla (borrar, marcar…) con confirmación opcional. */
export function ActionButton({
  action, children, className = "btn-ghost", confirm: confirmText, title,
}: { action: () => Promise<ActionResult>; children: ReactNode; className?: string; confirm?: string; title?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={pending}
        className={className}
        onClick={async () => {
          if (confirmText && !window.confirm(confirmText)) return;
          setPending(true);
          setError(null);
          const r = await action();
          setPending(false);
          if (r.error) setError(r.error);
        }}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : children}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </>
  );
}

/**
 * Hoja inferior (bottom sheet) para formularios. Se puede abrir desde un
 * parámetro de URL (?nuevo=...) para que los accesos rápidos del inicio funcionen.
 */
export function Sheet({
  trigger, title, children, openParam, triggerClassName = "btn-primary",
}: {
  trigger: ReactNode; title: string; children: (close: () => void) => ReactNode; openParam?: string; triggerClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (openParam && params.get("nuevo") === openParam) setOpen(true);
  }, [openParam, params]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    if (openParam && params.get("nuevo")) router.replace(pathname, { scroll: false });
  };

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>{trigger}</button>
      <dialog
        ref={ref}
        onClose={close}
        onClick={(e) => { if (e.target === ref.current) close(); }}
        className="m-0 mt-auto w-full max-w-none glass-strong rounded-t-3xl p-0 text-ink sm:m-auto sm:max-w-lg sm:rounded-3xl"
      >
        {open && (
          <div className="max-h-[88dvh] overflow-y-auto p-5 safe-bottom">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button type="button" onClick={close} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Cerrar"><X size={18} /></button>
            </div>
            {children(close)}
          </div>
        )}
      </dialog>
    </>
  );
}
