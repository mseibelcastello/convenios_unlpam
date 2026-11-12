"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Convenio = {
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  objeto: string;
  alcance: string;
  resolucion: string | null;
  expediente: string | null;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  fecha_preaviso: string | null;
  unidad: { nombre: string };
  partes: { id: number; nombre: string; tipo: string; pivot: { rol_parte: string } }[];
  // Consulta no recibe las personas
  personas?: { id: number; nombre: string; pivot: { rol: string } }[];
};

//lista de elementos ed antecedentes y derivados
type Vinculo = { id: number; codigo: string; titulo: string; tipo_vinculo: string };

export default function Ficha() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [antecedentes, setAntecedentes] = useState<Vinculo[]>([]);
  const [derivados, setDerivados] = useState<Vinculo[]>([]);

  //carga datos
  useEffect(() => {
    api.get(`/agreements/${id}`).then((r) => setConvenio(r.data));
    api.get(`/agreements/${id}/links`).then((r) => {
      setAntecedentes(r.data.antecedentes);
      setDerivados(r.data.derivados);
    });
  }, [id]);

  if (!convenio) return <p>Cargando…</p>;

  return (
    <>
      <p>
        <Link href="/convenios">← Volver al listado</Link>
      </p>
      <h1>
        {convenio.codigo} · {convenio.titulo}
      </h1>
      <p>
        {convenio.tipo} · {convenio.unidad.nombre} ·{" "}
        <span className={`insignia insignia-${convenio.estado}`}>{convenio.estado}</span>
      </p>

      {/* Solo se edita en borrador, y solo administración y gestión */}
      {convenio.estado === "borrador" && (usuario?.rol === "administracion" || usuario?.rol === "gestion") && (
        <p>
          <Link href={`/convenios/${id}/editar`}>Editar convenio</Link>
        </p>
      )}

      <section className="ficha-seccion">
        <h2>Vigencia</h2>
        <p>Firma: {convenio.fecha_firma ?? "sin registrar"}</p>
        <p>Inicio: {convenio.fecha_inicio ?? "sin registrar"}</p>
        <p>
          {convenio.fecha_vencimiento
            ? `Vence el ${convenio.fecha_vencimiento}` +
              (convenio.fecha_preaviso ? ` (preaviso el ${convenio.fecha_preaviso})` : "")
            : "Sin vencimiento registrado"}
        </p>
      </section>

      <section className="ficha-seccion">
        <h2>Datos principales</h2>
        <p>Objeto: {convenio.objeto}</p>
        <p>Alcance: {convenio.alcance}</p>
        <p>Resolución: {convenio.resolucion ?? "—"}</p>
        <p>Expediente: {convenio.expediente ?? "—"}</p>
      </section>



      <section className="ficha-seccion">
        <h2>Partes</h2>
        <ul>
          {convenio.partes.map((p) => (
            <li key={p.id}>
              {p.nombre} ({p.tipo}) · {p.pivot.rol_parte}
            </li>
          ))}
        </ul>
      </section>

      {convenio.personas && (
        <section className="ficha-seccion">
          <h2>Personas</h2>
          <ul>
            {convenio.personas.map((p) => (
              <li key={`${p.id}-${p.pivot.rol}`}>
                {p.nombre} · {p.pivot.rol}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ficha-seccion">
        <h2>Antecedentes</h2>
        {antecedentes.length === 0 && <p>Ninguno</p>}
        <ul>
          {antecedentes.map((v) => (
            <li key={v.id}>
              <Link href={`/convenios/${v.id}`}>
                {v.codigo} · {v.titulo}
              </Link>{" "}
              ({v.tipo_vinculo})
            </li>
          ))}
        </ul>
      </section>

      <section className="ficha-seccion">
        <h2>Derivados</h2>
        {derivados.length === 0 && <p>Ninguno</p>}
        <ul>
          {derivados.map((v) => (
            <li key={v.id}>
              <Link href={`/convenios/${v.id}`}>
                {v.codigo} · {v.titulo}
              </Link>{" "}
              ({v.tipo_vinculo})
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
