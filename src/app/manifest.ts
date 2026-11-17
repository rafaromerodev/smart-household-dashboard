import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nuestro Hogar",
    short_name: "Nuestro Hogar",
    description: "Nuestro centro de control familiar",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f5f2",
    theme_color: "#3f6b5a",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Añadir gasto", url: "/gastos?nuevo=gasto" },
      { name: "Lista de la compra", url: "/compras" },
      { name: "Registrar ahorro", url: "/ahorro?nuevo=aportacion" },
    ],
  };
}
