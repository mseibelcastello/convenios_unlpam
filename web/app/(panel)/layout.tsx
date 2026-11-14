"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "@/components/Iconos";
import LogoUnidad from "@/components/LogoUnidad";
import { useAuth } from "@/lib/auth";
import { menuPara, ROLES } from "@/lib/roles";

// El login deja esta marca para que el panel haga su animación de entrada solo después de iniciar sesión
function vieneDelLogin() {
  try {
    return sessionStorage.getItem("entrada-panel") === "1";
  } catch {
    return false;
  }
}

// Todo lo que está dentro de (panel) exige sesión: sin ella se redirige a /login.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { estado, usuario, cerrarSesion } = useAuth();
  const router = useRouter();
  const ruta = usePathname();
  const menuRef = useRef<HTMLElement>(null);
  const indicadorRef = useRef<HTMLSpanElement>(null);
  // Menú lateral abierto (solo se usa en el celular)
  const [abierto, setAbierto] = useState(false);
  const [entrada, setEntrada] = useState(vieneDelLogin);

  useEffect(() => {
    if (estado === "anonimo") router.replace("/login");
  }, [estado, router]);

  // Se borra la marca y, cuando termina la animación de entrada, se quita la clase
  // (así las navegaciones siguientes usan solo el fade corto)
  useEffect(() => {
    try {
      sessionStorage.removeItem("entrada-panel");
    } catch {}
    if (!entrada) return;
    const t = setTimeout(() => setEntrada(false), 2000);
    return () => clearTimeout(t);
  }, [entrada]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarConEsc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", cerrarConEsc);
    return () => window.removeEventListener("keydown", cerrarConEsc);
  }, [abierto]);

  // El indicador del menú se desliza hasta el item activo. Se mueve con transform, directo sobre el
  // elemento (sin estado), y la primera vez se ubica sin deslizar.
  useEffect(() => {
    const indicador = indicadorRef.current;
    const activo = menuRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!indicador) return;
    if (!activo) {
      indicador.style.opacity = "0";
      return;
    }
    indicador.style.height = `${activo.offsetHeight}px`;
    indicador.style.transform = `translateY(${activo.offsetTop}px)`;
    indicador.style.opacity = "1";
    const cuadro = requestAnimationFrame(() => indicador.classList.add("listo"));
    return () => cancelAnimationFrame(cuadro);
  }, [ruta, estado]);

  if (estado !== "autenticado" || !usuario) {
    return <p className="estado-carga">Cargando…</p>;
  }

  const items = menuPara(usuario.rol);
  const iniciales = usuario.name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  // Se marca un solo item: el de la ruta más larga que coincida
  // ("/convenios/nuevo" gana sobre "/convenios")
  let activoHref = "";
  for (const item of items) {
    const coincide = item.href === "/" ? ruta === "/" : ruta.startsWith(item.href);
    if (coincide && item.href.length > activoHref.length) activoHref = item.href;
  }
  const tituloActual = items.find((i) => i.href === activoHref)?.texto ?? "";
  const puedeCrear = items.some((i) => i.href === "/convenios/nuevo") && ruta !== "/convenios/nuevo";

  // Los items se agrupan por sección, conservando el orden
  const grupos: { titulo: string; items: typeof items }[] = [];
  for (const item of items) {
    const grupo = grupos.find((g) => g.titulo === item.grupo);
    if (grupo) grupo.items.push(item);
    else grupos.push({ titulo: item.grupo, items: [item] });
  }

  let numero = 0;

  return (
    <div className={entrada ? "panel panel-entrada" : "panel"}>
      <aside className={abierto ? "barra abierta" : "barra"}>
        <div className="barra-marca">
          <LogoUnidad />
          <span>
            <strong>Convenios</strong>
            <small>UNLPam</small>
          </span>
        </div>

        <nav aria-label="Principal" className="menu" ref={menuRef}>
          <span className="menu-indicador" ref={indicadorRef} aria-hidden="true" />
          {grupos.map((g) => (
            <div className="menu-grupo" key={g.titulo}>
              <p>{g.titulo}</p>
              {g.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ "--i": numero++ } as React.CSSProperties}
                  aria-current={item.href === activoHref ? "page" : undefined}
                  onClick={() => setAbierto(false)}
                >
                  <Icono nombre={item.icono} />
                  <span>{item.texto}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="barra-usuario">
          <span className="avatar" aria-hidden="true">
            {iniciales}
          </span>
          <span className="barra-usuario-datos">
            <strong>{usuario.name}</strong>
            <small>
              {ROLES[usuario.rol]}
              {usuario.unidad ? ` · ${usuario.unidad.sigla ?? usuario.unidad.nombre}` : ""}
            </small>
          </span>
          <button
            type="button"
            className="icono-boton"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={async () => {
              await cerrarSesion();
              router.replace("/login");
            }}
          >
            <Icono nombre="salir" />
          </button>
        </div>
      </aside>
      <div className={abierto ? "barra-fondo visible" : "barra-fondo"} onClick={() => setAbierto(false)} />

      <div className="panel-principal">
        <header className="panel-encabezado">
          <button type="button" className="icono-boton menu-boton" aria-label="Abrir menú" onClick={() => setAbierto(true)}>
            <Icono nombre="menu" />
          </button>
          <p className="migas">
            <span>Convenios UNLPam</span>
            <span aria-hidden="true">/</span>
            <strong>{tituloActual}</strong>
          </p>
          {puedeCrear && (
            <Link className="boton-principal" href="/convenios/nuevo">
              <Icono nombre="nuevo" />
              <span>Nuevo convenio</span>
            </Link>
          )}
        </header>

        <main className="panel-contenido">{children}</main>

        <footer className="panel-pie">
          <span>Universidad Nacional de La Pampa</span>
          <span>Sistema de convenios · {new Date().getFullYear()}</span>
        </footer>
      </div>
    </div>
  );
}
