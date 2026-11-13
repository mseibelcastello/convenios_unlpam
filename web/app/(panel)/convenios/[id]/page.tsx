"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ESTADOS } from "@/lib/estados";
import { PARTES, ROLES_PARTE, ROLES_PERSONA, TIPOS, VINCULOS } from "@/lib/tipos";
import AgregarParte from "./AgregarParte";
import AgregarPersona from "./AgregarPersona";
import AgregarVinculo from "./AgregarVinculo";

type Convenio = {
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  // Pueden faltar si el convenio se cargó con su PDF
  objeto: string | null;
  alcance: string | null;
  resolucion: string | null;
  expediente: string | null;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  fecha_preaviso: string | null;
  unidad: { nombre: string };
  partes: {
    id: number;
    nombre: string;
    tipo: string;
    representante: string | null;
    cargo_representante: string | null;
    pivot: { rol_parte: string };
  }[];
  // Consulta no recibe las personas
  personas?: { id: number; nombre: string; pivot: { rol: string; desde: string | null; hasta: string | null } }[];
};

//lista de elementos ed antecedentes y derivados
type Vinculo = { id: number; codigo: string; titulo: string; tipo_vinculo: string };

export default function Ficha() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [antecedentes, setAntecedentes] = useState<Vinculo[]>([]);
  const [derivados, setDerivados] = useState<Vinculo[]>([]);
  // Al sumar 1 se vuelven a cargar los datos (lo usan los formularios de agregar)
  const [recarga, setRecarga] = useState(0);

  //carga datos
  useEffect(() => {
    api.get(`/agreements/${id}`).then((r) => setConvenio(r.data));
    api.get(`/agreements/${id}/links`).then((r) => {
      setAntecedentes(r.data.antecedentes);
      setDerivados(r.data.derivados);
    });
  }, [id, recarga]);

  if (!convenio) return <p>Cargando…</p>;

  const puedeEditar = usuario?.rol === "administracion" || usuario?.rol === "gestion";

  return (
    <>
      <p>
        <Link href="/convenios">← Volver al listado</Link>
      </p>
      <h1>
        {convenio.codigo} · {convenio.titulo}
      </h1>
      <p>
        {TIPOS[convenio.tipo]} · {convenio.unidad.nombre} ·{" "}
        <span className={`insignia insignia-${convenio.estado}`}>{ESTADOS[convenio.estado]}</span>
      </p>

      {/* Solo se edita en borrador, y solo administración y gestión */}
      {convenio.estado === "borrador" && puedeEditar && (
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
        <p>Objeto: {convenio.objeto ?? "—"}</p>
        <p>Alcance: {convenio.alcance ?? "—"}</p>
        <p>Resolución: {convenio.resolucion ?? "—"}</p>
        <p>Expediente: {convenio.expediente ?? "—"}</p>
      </section>



      <section className="ficha-seccion">
        <h2>Partes</h2>
        <ul>
          {convenio.partes.map((p) => (
            <li key={p.id}>
              {p.nombre} ({PARTES[p.tipo]}) · {ROLES_PARTE[p.pivot.rol_parte]}
              {p.representante && (
                <>
                  {" "}
                  · Representante: {p.representante}
                  {p.cargo_representante && ` (${p.cargo_representante})`}
                </>
              )}
            </li>
          ))}
        </ul>

        {puedeEditar && <AgregarParte convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
      </section>

      {convenio.personas && (
        <section className="ficha-seccion">
          <h2>Personas</h2>
          <ul>
            {convenio.personas.map((p) => (
              <li key={`${p.id}-${p.pivot.rol}`}>
                {p.nombre} · {ROLES_PERSONA[p.pivot.rol]}
                {p.pivot.desde && ` · del ${p.pivot.desde}`}
                {p.pivot.hasta && ` al ${p.pivot.hasta}`}
              </li>
            ))}
          </ul>

          {puedeEditar && <AgregarPersona convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />}
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
              ({VINCULOS[v.tipo_vinculo]})
            </li>
          ))}
        </ul>

        {/* Los vínculos solo se cambian en borrador */}
        {convenio.estado === "borrador" && puedeEditar && (
          <AgregarVinculo convenioId={Number(id)} alGuardar={() => setRecarga(recarga + 1)} />
        )}
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
              ({VINCULOS[v.tipo_vinculo]})
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
