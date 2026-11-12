"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ESTADOS } from "@/lib/estados";
import { TIPOS } from "@/lib/tipos";

type Convenio = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  fecha_vencimiento: string | null;
  unidad: { nombre: string } | null;
};


export default function Convenios() {
  const [filtros, setFiltros] = useState({});
  const [pagina, setPagina] = useState(1);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [ultimaPagina, setUltimaPagina] = useState(1);

  useEffect(() => {
    api.get("/agreements", { params: { ...filtros, page: pagina } }).then((r) => {
      setConvenios(r.data.data);
      setUltimaPagina(r.data.meta.last_page);
    });
  }, [filtros, pagina]);

  // Los filtros se leen del formulario recién al apretar "Buscar"
  function buscar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFiltros(Object.fromEntries(new FormData(e.currentTarget)));
    setPagina(1);
  }

  return (
    <>
      <h1>Convenios</h1>

      <form className="filtros" onSubmit={buscar}>
        <input name="q" placeholder="Buscar por código o título" />
        <select name="tipo">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
        <select name="estado">
          <option value="">Todos los estados</option>
          {Object.entries(ESTADOS).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
        <input name="anio" placeholder="Año" maxLength={4} />
        <button type="submit">Buscar</button>
      </form>

      <table className="tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Título</th>
            <th>Tipo</th>
            <th>Unidad</th>
            <th>Estado</th>
            <th>Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          {convenios.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={`/convenios/${c.id}`}>{c.codigo}</Link>
              </td>
              <td>{c.titulo}</td>
              <td>{TIPOS[c.tipo]}</td>
              <td>{c.unidad?.nombre}</td>
              <td>
                <span className={`insignia insignia-${c.estado}`}>{ESTADOS[c.estado]}</span>
              </td>
              <td>{c.fecha_vencimiento}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="paginacion">
        <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
          Anterior
        </button>
        <span>
          Página {pagina} de {ultimaPagina}
        </span>
        <button disabled={pagina >= ultimaPagina} onClick={() => setPagina(pagina + 1)}>
          Siguiente
        </button>
      </div>
    </>
  );
}
