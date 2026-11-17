import { renderIcon } from "@/lib/icon";

const SIZES = new Set([192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);
  if (!SIZES.has(size)) return new Response("No encontrado", { status: 404 });
  const maskable = new URL(req.url).searchParams.has("maskable");
  const res = renderIcon(size, { maskable });
  res.headers.set("Cache-Control", "public, max-age=604800, immutable");
  return res;
}
