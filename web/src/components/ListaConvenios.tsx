"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Ventana from "@/components/Ventana";
import { api } from "@/lib/api";
import { ESTADOS } from "@/lib/estados";
import { diasHasta, fechaLarga } from "@/lib/fechas";
import { TIPOS } from "@/lib/tipos";

type Convenio = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
  unidad: { sigla: string; nombre: string } | null;
};

type Props = {
  abierta: boolean;
  titulo: string;
  // Filtros de GET /agreements (estado, vigencia...)
  filtros: Record<string, string>;
  alCerrar: () => void;
};

// Ventana con los convenios detrás de una tarjeta del panel; tocar uno abre su ficha
export default function ListaConvenios({ abierta, titulo, filtros, alCerrar }: Props) {
  return (
    <Ventana abierta={abierta} titulo={titulo} alCerrar={alCerrar}>
      <Contenido filtros={filtros} alCerrar={alCerrar} />
    </Ventana>
  );
}

function Contenido({ filtros, alCerrar }: { filtros: Record<string, string>; alCerrar: () => void }) {
  const [pagina, setPagina] = useState(1);
  const irA = (n: number) => {
    setCargando(true);
    setError(false);
    setPagina(n);
  };
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [total, setTotal] = useState(0);
  const [ultima, setUltima] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    api
      .get("/agreements", { params: { ...filtros, page: pagina } })
      .then((r) => {
        if (!vigente) return;
        setConvenios(r.data.data);
        setTotal(r.data.meta.total);
        setUltima(r.data.meta.last_page);
      })
      .catch(() => vigente && setError(true))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [filtros, pagina]);

  if (error) return <p className="login-error" role="alert">No se pudo cargar la lista. Probá de nuevo.</p>;

  if (cargando && convenios.length === 0) {
    return (
      <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando convenios">
        {Array.from({ length: 5 }, (_, i) => (
          <div className="esqueleto" key={i} />
        ))}
      </div>
    );
  }

  if (convenios.length === 0) {
    return (
      <div className="vacio-grande">
        <strong>No hay convenios en esta categoría</strong>
      </div>
    );
  }

  return (
    <>
      <p className="subtitulo">{total === 1 ? "1 convenio" : `${total} convenios`}</p>
      <ul className="lista-modal" aria-busy={cargando}>
        {convenios.map((c) => {
          const dias = c.fecha_vencimiento ? diasHasta(c.fecha_vencimiento) : null;
          return (
            <li key={c.id}>
              <Link href={`/convenios/${c.id}`} onClick={alCerrar}>
                <span className="lista-modal-codigo">{c.codigo}</span>
                <span className="lista-modal-titulo">{c.titulo}</span>
                <span className="lista-modal-meta">
                  {TIPOS[c.tipo]}
                  {c.unidad ? ` · ${c.unidad.sigla}` : ""}
                  {" · "}
                  {c.fecha_vencimiento ? `Vence ${fechaLarga(c.fecha_vencimiento)}` : "Sin vencimiento registrado"}
                </span>
              </Link>
              <span className="lista-modal-lado">
                <span className={`insignia insignia-${c.estado}`}>{ESTADOS[c.estado]}</span>
                {c.estado === "firmado" && dias !== null && dias < 0 && <span className="urgencia urgencia-vencido">Vencido</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {ultima > 1 && (
        <div className="paginacion">
          <button type="button" className="boton-secundario" disabled={pagina <= 1} onClick={() => irA(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {ultima}
          </span>
          <button type="button" className="boton-secundario" disabled={pagina >= ultima} onClick={() => irA(pagina + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}
