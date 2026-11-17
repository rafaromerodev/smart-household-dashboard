"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import type { ActionResult } from "@/lib/actions";

/** Formulario en una sola línea (añadir / renombrar). */
export function InlineForm({ action, children, submit, compact = false }: {
  action: (p: ActionResult, fd: FormData) => Promise<ActionResult>; children: React.ReactNode; submit: string; compact?: boolean;
}) {
  return (
    <ActionForm action={action} resetOnSuccess={!compact} className={`flex flex-1 flex-wrap items-center gap-2 ${compact ? "" : ""}`}>
      {children}
      <SubmitButton className={compact ? "btn-ghost min-h-9 px-3" : "btn-primary"} pendingText="…">{submit}</SubmitButton>
    </ActionForm>
  );
}
