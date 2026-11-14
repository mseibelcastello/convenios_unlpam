"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icono } from "@/components/Iconos";
import { api } from "@/lib/api";
import { descargarArchivo } from "@/lib/descargas";
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
  unidad: { nombre: string; sigla: string } | null;
};

const SIN_FILTROS = { q: "", tipo: "", estado: "", anio: "" };

// Vencimiento: la fecha y, en los firmados, cuánto falta si es pronto o si ya pasó
function Vencimiento({ c }: { c: Convenio }) {
  if (!c.fecha_vencimiento) return <span className="sin-dato">Sin vencimiento registrado</span>;
  const dias = diasHasta(c.fecha_vencimiento);
  const aviso = c.estado === "firmado" && dias <= 30;
  return (
    <span className="vencimiento">
      {fechaLarga(c.fecha_vencimiento)}
      {aviso && (
        <span className={`urgencia ${dias < 0 ? "urgencia-vencido" : "urgencia-pronto"}`}>
          {dias < 0 ? `Venció hace ${-dias} d` : dias === 0 ? "Vence hoy" : `Vence en ${dias} d`}
        </span>
      )}
    </span>
  );
}

export default function Convenios() {
  // Lo que hay escrito en los filtros, y lo que ya se aplicó (con una pequeña demora al escribir)
  const [campos, setCampos] = useState(SIN_FILTROS);
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [total, setTotal] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [avisoExportar, setAvisoExportar] = useState("");

  // Los filtros se aplican solos: al escribir se espera un instante, al elegir una opción es inmediato
  useEffect(() => {
    const demora = campos.q !== filtros.q ? 350 : 0;
    // El año se aplica cuando está completo (4 cifras) o vacío
    if (campos.anio !== filtros.anio && campos.anio.length !== 4 && campos.anio !== "") return;
    const t = setTimeout(() => {
      setFiltros(campos);
      setPagina(1);
    }, demora);
    return () => clearTimeout(t);
  }, [campos, filtros]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    api.get("/agreements", { params: { ...filtros, page: pagina } }).then((r) => {
      if (!vigente) return;
      setConvenios(r.data.data);
      setTotal(r.data.meta.total);
      setUltimaPagina(r.data.meta.last_page);
      setCargando(false);
    });
    return () => {
      vigente = false;
    };
  }, [filtros, pagina]);

  const hayFiltros = Object.values(campos).some(Boolean);

  function cambiar(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setCampos({ ...campos, [e.target.name]: e.target.value });
  }

  // Exporta en PDF los convenios que cumplen los filtros aplicados
  async function exportar() {
    setAvisoExportar("");
    if (convenios.length === 0) {
      setAvisoExportar("No hay convenios para exportar con estos filtros.");
      return;
    }
    setExportando(true);
    try {
      const hoy = new Date().toLocaleDateString("sv-SE");
      await descargarArchivo("/agreements/export", `convenios-${hoy}.pdf`, { ...filtros, formato: "pdf" });
    } catch (err) {
      setAvisoExportar(err instanceof Error ? err.message : "No se pudo exportar.");
    }
    setExportando(false);
  }

  return (
    <>
      <h1>
        Convenios <span className="contador">{total}</span>
      </h1>

      <form className="filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="buscador">
          <Icono nombre="buscar" />
          <input name="q" value={campos.q} onChange={cambiar} placeholder="Buscar por código o título" aria-label="Buscar por código o título" />
        </label>
        <select name="tipo" value={campos.tipo} onChange={cambiar} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
        <select name="estado" value={campos.estado} onChange={cambiar} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
        <input name="anio" value={campos.anio} onChange={cambiar} placeholder="Año" maxLength={4} inputMode="numeric" aria-label="Año" />
        {hayFiltros && (
          <button type="button" className="boton-texto" onClick={() => setCampos(SIN_FILTROS)}>
            Limpiar
          </button>
        )}
        <button type="button" className="boton-secundario" onClick={exportar} disabled={exportando}>
          {exportando ? "Generando PDF…" : "Exportar PDF"}
        </button>
      </form>

      {avisoExportar && <p role="status">{avisoExportar}</p>}

      {cargando && convenios.length === 0 && (
        <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando convenios">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="esqueleto" key={i} />
          ))}
        </div>
      )}

      {!cargando && convenios.length === 0 && (
        <div className="vacio-grande">
          <strong>No hay convenios con estos filtros</strong>
          <span>Probá con otra búsqueda o quitá algún filtro.</span>
          {hayFiltros && (
            <button type="button" className="boton-secundario" onClick={() => setCampos(SIN_FILTROS)}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {convenios.length > 0 && (
        <table className="tabla tabla-convenios" aria-busy={cargando}>
          <thead>
            <tr>
              <th>Convenio</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Vencimiento</th>
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
                  <span className={`insignia insignia-${c.estado}`}>{ESTADOS[c.estado]}</span>
                </td>
                <td>
                  <Vencimiento c={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {ultimaPagina > 1 && (
        <div className="paginacion">
          <button className="boton-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {ultimaPagina}
          </span>
          <button className="boton-secundario" disabled={pagina >= ultimaPagina} onClick={() => setPagina(pagina + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </>
  );
}
