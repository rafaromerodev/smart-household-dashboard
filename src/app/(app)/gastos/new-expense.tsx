"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Sheet } from "@/components/forms";
import { ExpenseForm, type ExpenseFormProps } from "./expense-form";
import { createExpense } from "./actions";

export function NewExpense(props: Omit<ExpenseFormProps, "action" | "onDone" | "highlightCamera">) {
  const params = useSearchParams();
  const camera = params.get("nuevo") === "ticket";
  return (
    <>
      <Sheet title="Nuevo gasto" openParam="gasto" trigger={<><Plus size={16} /> Gasto</>}>
        {(close) => <ExpenseForm {...props} action={createExpense} onDone={close} />}
      </Sheet>
      {/* Acceso rápido "Fotografiar ticket": mismo formulario con la cámara destacada */}
      <HiddenTicketSheet {...props} open={camera} />
    </>
  );
}

function HiddenTicketSheet(props: Omit<ExpenseFormProps, "action" | "onDone" | "highlightCamera"> & { open: boolean }) {
  if (!props.open) return null;
  return (
    <Sheet title="Gasto con ticket" openParam="ticket" trigger="Ticket" triggerClassName="hidden">
      {(close) => <ExpenseForm {...props} action={createExpense} onDone={close} highlightCamera />}
    </Sheet>
  );
}
