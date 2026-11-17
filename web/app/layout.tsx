import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat, Open_Sans } from "next/font/google";
import "./globals.css";
import "@/styles/tokens.css";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth";
import Sincronizador from "@/components/Sincronizador";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Las tipografías de la marca (las que pide src/styles/tokens.css): Montserrat para títulos y Open Sans para el texto
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Convenios UNLPam",
  description: "Gestión de convenios de la UNLPam",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* El panel lee la URL (usePathname): con Cache Components eso tiene que ir dentro de un Suspense,
            si no "next build" falla. La estructura que queda fuera es la que se pre-carga para navegar sin red. */}
        <Suspense fallback={<p className="estado-carga">Cargando…</p>}>
          <AuthProvider>
            {children}
            {/* Manda los cambios hechos sin conexión cuando vuelve la red */}
            <Sincronizador />
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
