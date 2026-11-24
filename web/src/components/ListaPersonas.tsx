"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Ventana from "@/components/Ventana";
import { api } from "@/lib/api";

type Persona = {
  id: number;
  nombre: string;
  legajo: string | null;
  convenios: { id: number; codigo: string; titulo: string; pivot: { rol: string } }[];
};

const ROLES_PERSONA: Record<string, string> = {
  representante: "Representante",
  responsable: "Responsable",
  docente_guia: "Docente guía",
  tutor: "Tutor",
  pasante: "Pasante",
};

type Props = { abierta: boolean; alCerrar: () => void };

// Las personas distintas que cuenta el panel, con los convenios del alcance del usuario en los que figuran
export default function ListaPersonas({ abierta, alCerrar }: Props) {
  return (
    <Ventana abierta={abierta} titulo="Personas únicas" alCerrar={alCerrar}>
      <Contenido alCerrar={alCerrar} />
    </Ventana>
  );
}

function Contenido({ alCerrar }: { alCerrar: () => void }) {
  const [pagina, setPagina] = useState(1);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [total, setTotal] = useState(0);
  const [ultima, setUltima] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const irA = (n: number) => {
    setCargando(true);
    setError(false);
    setPagina(n);
  };

  useEffect(() => {
    let vigente = true;
    api
      .get("/people", { params: { vinculadas: 1, page: pagina } })
      .then((r) => {
        if (!vigente) return;
        setPersonas(r.data.data);
        setTotal(r.data.meta.total);
        setUltima(r.data.meta.last_page);
      })
      .catch(() => vigente && setError(true))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [pagina]);

  if (error) return <p className="login-error" role="alert">No se pudo cargar la lista. Probá de nuevo.</p>;

  if (cargando && personas.length === 0) {
    return (
      <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando personas">
        {Array.from({ length: 5 }, (_, i) => (
          <div className="esqueleto" key={i} />
        ))}
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="vacio-grande">
        <strong>No hay personas vinculadas a convenios</strong>
      </div>
    );
  }

  return (
    <>
      <p className="subtitulo">{total === 1 ? "1 persona" : `${total} personas`}</p>
      <ul className="lista-personas" aria-busy={cargando}>
        {personas.map((p) => (
          <li key={p.id}>
            <p className="persona-nombre">
              <strong>{p.nombre}</strong>
              {p.legajo && <span>{p.legajo}</span>}
            </p>
            <ul className="persona-convenios">
              {p.convenios.map((c) => (
                <li key={`${c.id}-${c.pivot.rol}`}>
                  <Link href={`/convenios/${c.id}`} onClick={alCerrar}>
                    <span className="lista-modal-codigo">{c.codigo}</span>
                    <span className="lista-modal-titulo">{c.titulo}</span>
                  </Link>
                  <span className="etiqueta-tipo">{ROLES_PERSONA[c.pivot.rol] ?? c.pivot.rol}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
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
