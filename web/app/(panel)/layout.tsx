"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { menuPara } from "@/lib/roles";

// Todo lo que está dentro de (panel) exige sesión: sin ella se redirige a /login.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { estado, usuario, cerrarSesion } = useAuth();
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    if (estado === "anonimo") router.replace("/login");
  }, [estado, router]);

  if (estado !== "autenticado" || !usuario) {
    return <p className="estado-carga">Cargando…</p>;
  }

  return (
    <div className="panel">
      <header className="panel-encabezado">
        <strong className="panel-marca">Convenios UNLPam</strong>
        <nav aria-label="Principal" className="panel-menu">
          {menuPara(usuario.rol).map((item) => {
            const activo = item.href === "/" ? ruta === "/" : ruta.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} aria-current={activo ? "page" : undefined}>
                {item.texto}
              </Link>
            );
          })}
        </nav>
        <div className="panel-usuario">
          <span>
            {usuario.name} · {usuario.rol}
          </span>
          <button
            type="button"
            onClick={async () => {
              await cerrarSesion();
              router.replace("/login");
            }}
          >
            Salir
          </button>
        </div>
      </header>
      <main className="panel-contenido">{children}</main>
    </div>
  );
}
