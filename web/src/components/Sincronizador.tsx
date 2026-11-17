"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { sincronizar, useCola } from "@/lib/local";

// Manda la cola de cambios hechos sin conexión cuando vuelve la red (evento "online") y al abrir la app.
// Avisa lo que se envió y, si quedó algún conflicto, lleva a la pantalla para resolverlo.
export default function Sincronizador() {
  const { estado } = useAuth();
  const ruta = usePathname();
  const { pendientes, porResolver } = useCola();
  const [aviso, setAviso] = useState("");

  const conSesion = estado === "autenticado";

  useEffect(() => {
    if (!conSesion) return;

    function enviar() {
      sincronizar()
        .then((r) => {
          if (r.aplicados > 0) {
            setAviso(r.aplicados === 1 ? "Se envió 1 cambio hecho sin conexión." : `Se enviaron ${r.aplicados} cambios hechos sin conexión.`);
          }
        })
        // Sin conexión todavía: la cola queda como está y se reintenta con el próximo "online"
        .catch(() => {});
    }

    enviar();
    window.addEventListener("online", enviar);
    return () => window.removeEventListener("online", enviar);
  }, [conSesion]);

  // El aviso de "se envió" se va solo
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!conSesion) return null;

  const enConflictos = ruta === "/conflictos";

  return (
    <div className="sincronizador" aria-live="polite">
      {porResolver.length > 0 && !enConflictos && (
        <div className="sincronizador-aviso sincronizador-conflicto" role="status">
          <span>
            {porResolver.length === 1
              ? "Un cambio hecho sin conexión necesita tu decisión."
              : `${porResolver.length} cambios hechos sin conexión necesitan tu decisión.`}
          </span>
          <Link href="/conflictos">Resolver</Link>
        </div>
      )}
      {aviso && <div className="sincronizador-aviso">{aviso}</div>}
      {pendientes.length > 0 && !aviso && (
        <div className="sincronizador-aviso sincronizador-espera">
          {pendientes.length === 1 ? "1 cambio espera conexión para enviarse." : `${pendientes.length} cambios esperan conexión para enviarse.`}
        </div>
      )}
    </div>
  );
}
