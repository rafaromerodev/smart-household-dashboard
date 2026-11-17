"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, fail, parseForm } from "@/lib/actions";

const Credentials = z.object({
  email: z.string().trim().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  mode: z.enum(["entrar", "registro"]),
});

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos",
  email_not_confirmed: "Confirma tu email desde el enlace que te hemos enviado",
  user_already_exists: "Ya existe una cuenta con ese email",
  weak_password: "La contraseña es demasiado débil",
  signup_disabled: "El registro de nuevas cuentas está desactivado",
};

export async function authenticate(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(Credentials, fd);
  if ("error" in p) return fail(p.error);
  const { email, password, mode } = p.data;
  const supabase = await createClient();

  if (mode === "entrar") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(MESSAGES[error.code ?? ""] ?? error.message);
  } else {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return fail(MESSAGES[error.code ?? ""] ?? error.message);
    if (!data.session) return { ok: true, error: undefined };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
