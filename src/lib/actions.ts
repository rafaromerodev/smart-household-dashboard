import { z } from "zod";
import { parseEurosToCents } from "./domain/money";

/** needsConfirm: la acción pide confirmación explícita (p. ej. posible duplicado). */
export type ActionResult = { ok: boolean; error?: string; needsConfirm?: string };

export const OK: ActionResult = { ok: true };
export const fail = (error: string): ActionResult => ({ ok: false, error });

/** Traduce errores de Postgres/Supabase a mensajes comprensibles. */
export function dbError(e: { message: string; code?: string } | null): ActionResult {
  if (!e) return OK;
  if (e.code === "23505") return fail("Ya existe un registro igual");
  if (e.code === "23514") return fail("Algún dato no es válido");
  if (e.code === "42501") return fail("No tienes permiso para esta acción");
  return fail(e.message);
}

// Helpers de validación para FormData
// Campo ausente o vacío → null
const emptyToNull = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

export const zText = (max = 200) => z.string().trim().min(1, "Campo obligatorio").max(max);
export const zOptText = (max = 1000) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable());
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");
export const zOptDate = z.preprocess(emptyToNull, zDate.nullable());
export const zUuid = z.string().uuid();
export const zOptUuid = z.preprocess(emptyToNull, z.string().uuid().nullable());
export const zEuros = z
  .string()
  .transform((s, ctx) => {
    const c = parseEurosToCents(s);
    if (c == null || c <= 0) {
      ctx.addIssue({ code: "custom", message: "Importe no válido" });
      return z.NEVER;
    }
    return c;
  });
export const zOptNumber = z.preprocess(
  (v) => (v === undefined ? null : typeof v === "string" ? (v.trim() === "" ? null : Number(v.replace(",", "."))) : v),
  z.number().finite().nonnegative().nullable(),
);

export function parseForm<T extends z.ZodTypeAny>(schema: T, fd: FormData): { data: z.infer<T> } | { error: string } {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") obj[k] = v;
  const r = schema.safeParse(obj);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { error: `${issue.path.join(".") ? issue.path.join(".") + ": " : ""}${issue.message}` };
  }
  return { data: r.data };
}
