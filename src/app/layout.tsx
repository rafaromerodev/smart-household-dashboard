import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Nuestro Hogar", template: "%s · Nuestro Hogar" },
  description: "Compras, gastos, ahorro, entrenamientos y tareas de casa en un solo sitio.",
  applicationName: "Nuestro Hogar",
  appleWebApp: { capable: true, title: "Nuestro Hogar", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0f0e" },
  ],
};

// Aplica el fondo elegido (guardado en este dispositivo) antes de pintar, sin parpadeo.
const WALL_SCRIPT = `try{var w=localStorage.getItem("ar-wall");if(w){document.documentElement.dataset.wall=w;if(w==="foto"){var i=localStorage.getItem("ar-wall-img");if(i)document.documentElement.style.setProperty("--wall-img","url("+i+")");else delete document.documentElement.dataset.wall}}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: WALL_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <div className="wallpaper" aria-hidden />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
