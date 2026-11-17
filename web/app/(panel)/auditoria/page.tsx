"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ESTADOS } from "@/lib/estados";
import { ROLES } from "@/lib/roles";

type Registro = {
  id: number;
  fecha: string;
  usuario: { id: number; nombre: string; rol: keyof typeof ROLES };
  accion: string;
  entidad: string;
  entidad_id: number | null;
  convenio: { id: number; codigo: string; titulo: string } | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  fundamento: string | null;
};

type OpcionConvenio = { id: number; codigo: string; titulo: string };

// Cómo se muestra cada acción y cada entidad que guarda la API
const ACCIONES: Record<string, string> = {
  "cambiar estado": "Cambio de estado",
  descargar: "Descarga",
  subir: "Subida",
  crear: "Alta",
  editar: "Edición",
  exportar: "Exportación",
  "consultar datos personales": "Consulta de datos personales",
};

const ENTIDADES: Record<string, string> = {
  convenios: "Convenio",
  documentos: "Documento",
  observaciones: "Observación",
  comentarios: "Comentario",
  personas: "Personas",
  identidades: "Identidad",
};

const SIN_FILTROS = { convenio_id: "", accion: "" };

function fechaHora(texto: string) {
  return new Date(texto).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Qué pasó, en palabras: la acción y, si corresponde, sobre qué y el cambio de estado
function Detalle({ r }: { r: Registro }) {
  if (r.accion === "cambiar estado") {
    return (
      <span className="auditoria-transicion">
        <span className={`insignia insignia-${r.estado_anterior}`}>{ESTADOS[r.estado_anterior ?? ""] ?? r.estado_anterior}</span>
        <span aria-hidden="true">→</span>
        <span className="lector">a</span>
        <span className={`insignia insignia-${r.estado_nuevo}`}>{ESTADOS[r.estado_nuevo ?? ""] ?? r.estado_nuevo}</span>
        {r.fundamento && <small>Fundamento: {r.fundamento}</small>}
      </span>
    );
  }
  const entidad = ENTIDADES[r.entidad] ?? r.entidad;
  return (
    <span>
      {entidad}
      {r.entidad_id && r.entidad !== "convenios" ? ` #${r.entidad_id}` : ""}
    </span>
  );
}

export default function Auditoria() {
  const { usuario } = useAuth();
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [total, setTotal] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [acciones, setAcciones] = useState<string[]>([]);
  const [convenios, setConvenios] = useState<OpcionConvenio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const esAdmin = usuario?.rol === "administracion";

  useEffect(() => {
    if (!esAdmin) return;
    let vigente = true;
    api
      .get("/audit", { params: { ...filtros, page: pagina } })
      .then((r) => {
        if (!vigente) return;
        setRegistros(r.data.data);
        setTotal(r.data.meta.total);
        setUltimaPagina(r.data.meta.last_page);
        setAcciones(r.data.filtros.acciones);
        setConvenios(r.data.filtros.convenios);
      })
      .catch(() => vigente && setError("No se pudo cargar la auditoría."))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [esAdmin, filtros, pagina]);

  // El servidor también lo bloquea (403); esto evita mostrar una página vacía
  if (usuario && !esAdmin) {
    return (
      <div className="vacio-grande">
        <strong>Sin acceso</strong>
        <span>La auditoría solo está disponible para administración.</span>
      </div>
    );
  }

  // Cada cambio de filtro o de página vuelve a pedir la lista
  function ir(nuevosFiltros: typeof SIN_FILTROS, nuevaPagina: number) {
    setCargando(true);
    setError("");
    setFiltros(nuevosFiltros);
    setPagina(nuevaPagina);
  }

  function cambiar(e: React.ChangeEvent<HTMLSelectElement>) {
    ir({ ...filtros, [e.target.name]: e.target.value }, 1);
  }

  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <>
      <h1>
        Auditoría <span className="contador">{total}</span>
      </h1>
      <p className="subtitulo">Quién hizo qué y cuándo: cambios de estado, descargas, subidas y consultas.</p>

      <form className="filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <select name="convenio_id" value={filtros.convenio_id} onChange={cambiar} aria-label="Convenio">
          <option value="">Todos los convenios</option>
          {convenios.map((c) => (
            <option key={c.id} value={c.id}>
              {c.codigo} · {c.titulo}
            </option>
          ))}
        </select>
        <select name="accion" value={filtros.accion} onChange={cambiar} aria-label="Tipo de acción">
          <option value="">Todas las acciones</option>
          {acciones.map((a) => (
            <option key={a} value={a}>
              {ACCIONES[a] ?? a}
            </option>
          ))}
        </select>
        {hayFiltros && (
          <button
            type="button"
            className="boton-texto"
            onClick={() => ir(SIN_FILTROS, 1)}
          >
            Limpiar
          </button>
        )}
      </form>

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      {cargando && registros.length === 0 && (
        <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando auditoría">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="esqueleto" key={i} />
          ))}
        </div>
      )}

      {!cargando && !error && registros.length === 0 && (
        <div className="vacio-grande">
          <strong>No hay registros con estos filtros</strong>
          <span>Probá con otro convenio u otra acción.</span>
        </div>
      )}

      {registros.length > 0 && (
        <div className="tabla-desplazable">
          <table className="tabla tabla-auditoria" aria-busy={cargando}>
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Detalle</th>
                <th>Convenio</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="auditoria-fecha">{fechaHora(r.fecha)}</td>
                  <td>
                    <strong>{r.usuario.nombre}</strong>
                    <small>{ROLES[r.usuario.rol] ?? r.usuario.rol}</small>
                  </td>
                  <td>
                    <span className="etiqueta-tipo">{ACCIONES[r.accion] ?? r.accion}</span>
                  </td>
                  <td>
                    <Detalle r={r} />
                  </td>
                  <td>
                    {r.convenio ? (
                      <Link href={`/convenios/${r.convenio.id}`} className="codigo" title={r.convenio.titulo}>
                        {r.convenio.codigo}
                      </Link>
                    ) : (
                      <span className="sin-dato">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ultimaPagina > 1 && (
        <div className="paginacion">
          <button className="boton-secundario" disabled={pagina <= 1} onClick={() => ir(filtros, pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          <button className="boton-secundario" disabled={pagina >= ultimaPagina} onClick={() => ir(filtros, pagina + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}
