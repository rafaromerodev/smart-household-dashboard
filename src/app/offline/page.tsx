import { WifiOff } from "lucide-react";

export const dynamic = "force-static";
export const metadata = { title: "Sin conexión" };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
      <WifiOff size={36} className="text-muted" />
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="text-sm text-muted">
        La app necesita internet para leer y guardar datos compartidos. Vuelve a intentarlo cuando tengas cobertura.
      </p>
      {/* Recarga completa a propósito: el router del cliente no sirve sin conexión */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="btn-primary">Reintentar</a>
    </main>
  );
}
