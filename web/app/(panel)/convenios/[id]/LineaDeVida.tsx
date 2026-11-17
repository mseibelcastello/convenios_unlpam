"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { ESTADOS } from "@/lib/estados";
import { fechaLarga } from "@/lib/fechas";
import { useConCopiaLocal } from "@/lib/local";
import { TIPOS, VINCULOS } from "@/lib/tipos";

type Tramo = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  unidad: string | null;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  situacion: "vigente" | "proximo_a_vencer" | "vencido" | "en_tramite" | "rescindido" | "archivado";
  dias_para_vencer: number | null;
  es_el_consultado: boolean;
  vinculos: { tipo_vinculo: string; relacion: "antecedente" | "derivado"; convenio_id: number; codigo: string }[];
};

type Respuesta = {
  convenio_id: number;
  resumen: { tramos: number; vigentes: number; proximos_a_vencer: number; vencidos: number; en_tramite: number };
  tramos: Tramo[];
};

// La situación siempre se dice con texto; el color solo acompaña
function situacion(t: Tramo) {
  switch (t.situacion) {
    case "vigente":
      return { clase: "vida-vigente", texto: "Vigente" };
    case "proximo_a_vencer":
      return { clase: "vida-por-vencer", texto: t.dias_para_vencer === 0 ? "Vence hoy" : `Vence en ${t.dias_para_vencer} d` };
    case "vencido":
      return { clase: "vida-vencido", texto: `Vencido hace ${-(t.dias_para_vencer ?? 0)} d` };
    case "en_tramite":
      return { clase: "vida-tramite", texto: `En trámite · ${ESTADOS[t.estado] ?? t.estado}` };
    default:
      return { clase: "vida-terminado", texto: ESTADOS[t.situacion] ?? t.situacion };
  }
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

// Resumen para lectores de pantalla: qué hay en la línea, sin tener que recorrerla
function resumenEnTexto(r: Respuesta) {
  const partes = [
    r.resumen.vigentes && plural(r.resumen.vigentes, "vigente", "vigentes"),
    r.resumen.proximos_a_vencer && plural(r.resumen.proximos_a_vencer, "por vencer", "por vencer"),
    r.resumen.vencidos && plural(r.resumen.vencidos, "vencido", "vencidos"),
    r.resumen.en_tramite && plural(r.resumen.en_tramite, "en trámite", "en trámite"),
  ].filter(Boolean);
  const actual = r.tramos.findIndex((t) => t.es_el_consultado) + 1;
  return `Línea de vida con ${plural(r.tramos.length, "instrumento", "instrumentos")}, ordenados por fecha${
    partes.length ? `: ${partes.join(", ")}` : ""
  }. Este convenio es el número ${actual}. Usá las flechas izquierda y derecha para pasar de un instrumento a otro.`;
}

/**
 * Línea de vida: toda la cadena de antecedentes y derivados del convenio (marco, específicos, adendas,
 * renovaciones) en una línea de tiempo horizontal. Cada nodo lleva a la ficha de ese instrumento.
 */
export default function LineaDeVida({ convenioId, recarga }: { convenioId: number; recarga: number }) {
  const lectura = useConCopiaLocal<Respuesta>(`/agreements/${convenioId}/lifeline`, convenioId, "lineaDeVida", recarga);
  const lista = useRef<HTMLOListElement>(null);
  const idTitulo = useId();
  const idResumen = useId();
  const datos = lectura.datos;

  // El instrumento actual queda a la vista (sin mover la página, solo la línea)
  useEffect(() => {
    const ol = lista.current;
    const actual = ol?.querySelector<HTMLElement>("[aria-current]");
    if (ol && actual) ol.scrollLeft = actual.offsetLeft - ol.clientWidth / 2 + actual.offsetWidth / 2;
  }, [datos]);

  if (!datos || datos.tramos.length < 2) return null; // sin antecedentes ni derivados no hay línea que mostrar

  // Flechas, Inicio y Fin pasan el foco de un instrumento a otro (Tab sigue funcionando como siempre)
  function teclas(e: React.KeyboardEvent<HTMLOListElement>) {
    const enlaces = [...(lista.current?.querySelectorAll<HTMLAnchorElement>("a.vida-nodo") ?? [])];
    const i = enlaces.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: enlaces.length - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    const enlace = enlaces[Math.max(0, Math.min(enlaces.length - 1, destino))];
    enlace.focus();
    enlace.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <section className="ficha-seccion linea-de-vida" aria-labelledby={idTitulo} aria-describedby={idResumen}>
      <h2 id={idTitulo}>
        Línea de vida <span className="contador">{datos.tramos.length}</span>
      </h2>
      <p id={idResumen} className="lector">
        {resumenEnTexto(datos)}
      </p>
      <p className="vida-ayuda" aria-hidden="true">
        Antecedentes y derivados del convenio, por fecha. Tocá un instrumento para abrirlo.
      </p>

      <ol className="vida" ref={lista} onKeyDown={teclas} aria-label="Instrumentos de la cadena, por fecha">
        {datos.tramos.map((t, i) => {
          const s = situacion(t);
          const antecedentes = t.vinculos.filter((v) => v.relacion === "antecedente");
          const fechas = [
            t.fecha_inicio ? `Inicio ${fechaLarga(t.fecha_inicio)}` : t.fecha_firma ? `Firma ${fechaLarga(t.fecha_firma)}` : null,
            t.fecha_vencimiento ? `Vence ${fechaLarga(t.fecha_vencimiento)}` : null,
          ].filter(Boolean);
          const relacion = antecedentes.map((v) => `${VINCULOS[v.tipo_vinculo] ?? v.tipo_vinculo} ${v.codigo}`).join(" · ");

          return (
            <li key={t.id} className={`vida-tramo ${s.clase}`}>
              <span className="vida-punto" aria-hidden="true" />
              <Link
                href={`/convenios/${t.id}`}
                className={t.es_el_consultado ? "vida-nodo actual" : "vida-nodo"}
                aria-current={t.es_el_consultado ? "page" : undefined}
              >
                {/* El lector lee el mismo texto que se ve, con la posición adelante */}
                <span className="lector">
                  {i + 1} de {datos.tramos.length}:{" "}
                </span>
                <span className="vida-tipo">{TIPOS[t.tipo] ?? t.tipo}</span>
                <strong className="vida-codigo">{t.codigo}</strong>
                <span className="vida-titulo">{t.titulo}</span>
                <span className="vida-fechas">{fechas.length ? fechas.join(" · ") : "Sin fechas todavía"}</span>
                <span className={`vida-situacion ${s.clase}`}>{s.texto}</span>
                {relacion && <span className="vida-relacion">{relacion}</span>}
                {t.es_el_consultado && <span className="vida-aqui">Estás acá</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
