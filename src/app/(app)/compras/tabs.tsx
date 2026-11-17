"use client";

import { usePathname } from "next/navigation";
import { Segmented } from "@/components/segmented";

const TABS = [
  { key: "/compras", href: "/compras", label: "Lista" },
  { key: "/compras/menu", href: "/compras/menu", label: "Menú" },
  { key: "/compras/recetas", href: "/compras/recetas", label: "Recetas" },
  { key: "/compras/despensa", href: "/compras/despensa", label: "En casa" },
];

export function ComprasTabs() {
  const path = usePathname();
  const active = TABS.slice().reverse().find((t) => (t.key === "/compras" ? path === "/compras" : path.startsWith(t.key)))?.key ?? "/compras";
  return <Segmented className="mb-5 md:w-[28rem]" options={TABS} active={active} />;
}
