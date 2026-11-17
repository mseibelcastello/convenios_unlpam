"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { TIPOS } from "@/lib/tipos";

type Convenio = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  unidad: { nombre: string; sigla: string } | null;
  observaciones_pendientes: number;
};

export default function PanelRevision() {
  const { usuario } = useAuth();
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  const esRevision = usuario?.rol === "revision";

  useEffect(() => {
    if (!esRevision) return;
    let vigente = true;
    api
      .get("/agreements", { params: { estado: "revision", page: pagina } })
      .then((r) => {
        if (!vigente) return;
        setConvenios(r.data.data);
        setTotal(r.data.meta.total);
        setUltimaPagina(r.data.meta.last_page);
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [esRevision, pagina]);

  // Aprobar y devolver son pasos exclusivos de revisión (la API devuelve 403 a los demás)
  if (usuario && !esRevision) {
    return (
      <div className="vacio-grande">
        <strong>Sin acceso</strong>
        <span>El panel de revisión es para el rol revisión.</span>
      </div>
    );
  }

  function irA(nueva: number) {
    setCargando(true);
    setPagina(nueva);
  }

  const conPendientes = convenios.filter((c) => c.observaciones_pendientes > 0).length;

  return (
    <>
      <h1>
        Panel de revisión <span className="contador">{total}</span>
      </h1>
      <p className="subtitulo">
        Convenios que esperan tu revisión. Abrí uno para ver la ficha y sus documentos, y aprobarlo o devolverlo.
      </p>

      {conPendientes > 0 && (
        <p className="aviso-observaciones" role="status">
          {conPendientes === 1
            ? "1 convenio de esta página tiene observaciones sin resolver."
            : `${conPendientes} convenios de esta página tienen observaciones sin resolver.`}
        </p>
      )}

      {cargando && convenios.length === 0 && (
        <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando convenios en revisión">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="esqueleto" key={i} />
          ))}
        </div>
      )}

      {!cargando && convenios.length === 0 && (
        <div className="vacio-grande">
          <strong>No hay convenios en revisión</strong>
          <span>Cuando gestión envíe uno, va a aparecer acá.</span>
        </div>
      )}

      {convenios.length > 0 && (
        <table className="tabla tabla-convenios" aria-busy={cargando}>
          <thead>
            <tr>
              <th>Convenio</th>
              <th>Tipo</th>
              <th>Observaciones pendientes</th>
            </tr>
          </thead>
          <tbody>
            {convenios.map((c) => (
              <tr key={c.id}>
                <td className="celda-convenio">
                  <Link href={`/convenios/${c.id}`} className="codigo">
                    {c.codigo}
                  </Link>
                  <span className="titulo">{c.titulo}</span>
                  {c.unidad && <small title={c.unidad.nombre}>{c.unidad.sigla}</small>}
                </td>
                <td className="celda-tipo">
                  <span className="etiqueta-tipo">{TIPOS[c.tipo]}</span>
                </td>
                <td>
                  {c.observaciones_pendientes > 0 ? (
                    <span className="obs-estado obs-pendiente">{c.observaciones_pendientes} sin resolver</span>
                  ) : (
                    <span className="obs-estado obs-resuelta">Ninguna</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {ultimaPagina > 1 && (
        <div className="paginacion">
          <button className="boton-secundario" disabled={pagina <= 1} onClick={() => irA(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          <button className="boton-secundario" disabled={pagina >= ultimaPagina} onClick={() => irA(pagina + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}
