"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Icono } from "@/components/Iconos";
import { api } from "@/lib/api";

type Aviso = {
  id: number;
  tipo: string;
  texto: string;
  leida: boolean;
  fecha: string;
  convenio: { id: number; codigo: string; titulo: string; estado: string } | null;
  enlace: string;
};

// Cada cuánto se vuelve a preguntar si hay avisos nuevos
const CADA_MS = 60_000;

// El tipo decide el color del punto: vencido en rojo, lo que pide atención en naranja
const URGENCIA: Record<string, string> = {
  vencido: "aviso-urgente",
  preaviso: "aviso-atencion",
  rescindido: "aviso-urgente",
  revision_asignada: "aviso-atencion",
};

function hace(fecha: string) {
  const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

// Campana del encabezado: cuántos avisos sin leer hay y la lista de GET /alerts con enlace a cada ficha
export default function Campana() {
  const router = useRouter();
  const [abierta, setAbierta] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idLista = useId();

  const cargar = useCallback(() => {
    api
      .get("/alerts")
      .then((r) => {
        setAvisos(r.data.data);
        setNoLeidas(r.data.meta.no_leidas);
        setError(false);
      })
      // Sin conexión se queda con lo último que tenía
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  // Al montar, cada minuto y al volver a la pestaña
  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, CADA_MS);
    window.addEventListener("focus", cargar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("focus", cargar);
    };
  }, [cargar]);

  // Se cierra con Escape (vuelve el foco a la campana) o tocando afuera
  useEffect(() => {
    if (!abierta) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierta(false);
        boton.current?.focus();
      }
    }
    function afuera(e: PointerEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierta(false);
    }
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", afuera);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("pointerdown", afuera);
    };
  }, [abierta]);

  function alternar() {
    if (!abierta) cargar();
    setAbierta(!abierta);
  }

  // Abrir un aviso: se marca como leído y se va a la ficha del convenio
  async function abrir(aviso: Aviso) {
    setAbierta(false);
    if (!aviso.leida) {
      setAvisos((lista) => lista.map((a) => (a.id === aviso.id ? { ...a, leida: true } : a)));
      setNoLeidas((n) => Math.max(0, n - 1));
      // Una recarga de /alerts que estaba en camino puede pisar el contador con el valor viejo:
      // después de confirmar el "leído" se vuelve a pedir, así queda lo que dice el servidor
      await api.post(`/alerts/${aviso.id}/read`).catch(() => {});
      cargar();
    }
    router.push(aviso.enlace);
  }

  const etiqueta = noLeidas === 0 ? "Avisos: ninguno sin leer" : `Avisos: ${noLeidas} sin leer`;

  return (
    <div className="campana" ref={contenedor}>
      <button
        type="button"
        ref={boton}
        className="icono-boton campana-boton"
        aria-label={etiqueta}
        title={etiqueta}
        aria-expanded={abierta}
        aria-controls={idLista}
        onClick={alternar}
      >
        <Icono nombre="campana" />
        {noLeidas > 0 && (
          <span className="campana-contador" aria-hidden="true">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      <div id={idLista} className="campana-lista" hidden={!abierta}>
        <p className="campana-titulo">
          <strong>Avisos</strong>
          {noLeidas > 0 && <span>{noLeidas} sin leer</span>}
        </p>

        {error && avisos.length === 0 && <p className="campana-vacia">No se pudieron cargar los avisos.</p>}
        {!error && !cargando && avisos.length === 0 && <p className="campana-vacia">No tenés avisos.</p>}

        {avisos.length > 0 && (
          <ul>
            {avisos.map((a) => (
              <li key={a.id}>
                <button type="button" className={a.leida ? "campana-aviso" : "campana-aviso no-leido"} onClick={() => abrir(a)}>
                  <span className={`campana-punto ${URGENCIA[a.tipo] ?? ""}`} aria-hidden="true" />
                  <span className="campana-texto">
                    <span>{a.texto}</span>
                    <small>
                      {hace(a.fecha)}
                      {!a.leida && <span className="lector"> · sin leer</span>}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
