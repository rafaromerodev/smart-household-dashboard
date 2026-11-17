"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";

/** Registra el service worker, avisa si no hay conexión y refresca datos al volver a la app. */
export function ServiceWorker() {
  const router = useRouter();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); router.refresh(); };
    const off = () => setOnline(false);
    // Al volver a la app (p. ej. tras cambiar de app en el iPhone) se recargan los datos
    // para ver lo que haya registrado la otra persona.
    const vis = () => { if (document.visibilityState === "visible") router.refresh(); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [router]);

  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warn px-3 py-1.5 text-xs font-medium text-white safe-top">
      <WifiOff size={14} /> Sin conexión: los cambios no se guardarán hasta que vuelva la red
    </div>
  );
}
