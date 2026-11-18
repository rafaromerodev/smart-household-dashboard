"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult, fail, parseForm, zText } from "@/lib/actions";

const Schema = z.object({
  modo: z.enum(["crear", "unirse"]),
  nombre: zText(40),
  hogar: z.string().trim().max(80).optional(),
  codigo: z.string().trim().max(20).optional(),
});

export async function setupHousehold(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const p = parseForm(Schema, fd);
  if ("error" in p) return fail(p.error);
  const supabase = await createClient();
  const { modo, nombre, hogar, codigo } = p.data;
  const { data, error } =
    modo === "crear"
      ? await supabase.rpc("create_household", { p_name: hogar || "Nuestro hogar", p_display_name: nombre })
      : await supabase.rpc("join_household", { p_code: codigo ?? "", p_display_name: nombre });
  if (error) return fail(error.message);
  // join_household devuelve null (y cuenta el intento) cuando el código no existe.
  if (!data) return fail("Código de invitación no válido");
  redirect("/");
}
