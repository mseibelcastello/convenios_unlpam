"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { diasHasta, fechaLarga } from "@/lib/fechas";
import { TIPOS } from "@/lib/tipos";

type Item = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  fecha_vencimiento: string;
  fecha_preaviso: string | null;
};

// Lo que usamos de GET /dashboard (las listas ya vienen filtradas por el alcance del usuario)
type Datos = {
  firmados: { total: number; vigentes: number; vencidos: number; sin_vencimiento_registrado: number };
  proximos_a_vencer: { dias: number; total: number; convenios: Item[] };
  vencidos: { total: number; convenios: Item[] };
};

type Unidad = { id: number; nombre: string; sigla?: string };

function Tabla({ convenios, vacio }: { convenios: Item[]; vacio: string }) {
  if (convenios.length === 0) return <p className="vacio">{vacio}</p>;
  return (
    <div className="tabla-desplazable">
      <table className="tabla">
        <thead>
          <tr>
            <th>Convenio</th>
            <th>Tipo</th>
            <th>Vencimiento</th>
            <th>Situación</th>
          </tr>
        </thead>
        <tbody>
          {convenios.map((c) => {
            const dias = diasHasta(c.fecha_vencimiento);
            const clase = dias < 0 ? "urgencia-vencido" : "urgencia-pronto";
            const texto = dias < 0 ? `Venció hace ${-dias} d` : dias === 0 ? "Vence hoy" : `Vence en ${dias} d`;
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/convenios/${c.id}`}>
                    <strong>{c.codigo}</strong>
                  </Link>
                  <small style={{ display: "block" }}>{c.titulo}</small>
                </td>
                <td>
                  <span className="etiqueta-tipo">{TIPOS[c.tipo] ?? c.tipo}</span>
                </td>
                <td>{fechaLarga(c.fecha_vencimiento)}</td>
                <td>
                  <span className={`urgencia ${clase}`}>{texto}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Convenios firmados vencidos y por vencer. Usa el mismo resumen que el inicio (GET /dashboard).
export default function Vencimientos() {
  const { usuario } = useAuth();
  // Quien trabaja sobre una unidad solo ve la suya: el filtro es para los usuarios globales
  const global = usuario !== null && !usuario.unidad;
  const [unidadId, setUnidadId] = useState("");
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!global) return;
    api
      .get("/unidades")
      .then((r) => setUnidades(r.data))
      .catch(() => {});
  }, [global]);

  useEffect(() => {
    let vigente = true;
    api
      .get("/dashboard", { params: unidadId ? { unidad_id: unidadId } : {} })
      .then((r) => vigente && setDatos(r.data))
      .catch(() => vigente && setError("No se pudieron cargar los vencimientos."));
    return () => {
      vigente = false;
    };
  }, [unidadId]);

  return (
    <>
      <h1>Vencimientos</h1>
      <p className="subtitulo">Convenios firmados que ya vencieron o que vencen pronto.</p>

      {global && unidades.length > 1 && (
        <form className="filtros" role="search" onSubmit={(e) => e.preventDefault()}>
          <select
            value={unidadId}
            onChange={(e) => {
              setDatos(null);
              setError("");
              setUnidadId(e.target.value);
            }}
            aria-label="Unidad"
          >
            <option value="">Todas las unidades</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.sigla ? `${u.sigla} · ${u.nombre}` : u.nombre}
              </option>
            ))}
          </select>
        </form>
      )}

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      {!datos && !error && (
        <div className="lista-esqueleto" aria-busy="true" aria-label="Cargando vencimientos">
          <div className="esqueleto" />
          <div className="esqueleto" />
        </div>
      )}

      {datos && (
        <>
          <div className="tarjetas">
            <div className="tarjeta estado-rescindido">
              <strong>{datos.vencidos.total}</strong>
              <span>Vencidos</span>
            </div>
            <div className="tarjeta">
              <strong>{datos.proximos_a_vencer.total}</strong>
              <span>Vencen en {datos.proximos_a_vencer.dias} días</span>
            </div>
            <div className="tarjeta estado-firmado">
              <strong>{datos.firmados.vigentes}</strong>
              <span>Firmados vigentes</span>
            </div>
            <div className="tarjeta">
              <strong>{datos.firmados.sin_vencimiento_registrado}</strong>
              <span>Sin vencimiento registrado</span>
            </div>
          </div>

          <section className="ficha-seccion">
            <h2>
              Vencen en los próximos {datos.proximos_a_vencer.dias} días{" "}
              <span className="contador">{datos.proximos_a_vencer.total}</span>
            </h2>
            <Tabla convenios={datos.proximos_a_vencer.convenios} vacio="Ninguno vence en este período." />
          </section>

          <section className="ficha-seccion">
            <h2>
              Vencidos <span className="contador">{datos.vencidos.total}</span>
            </h2>
            <Tabla convenios={datos.vencidos.convenios} vacio="No hay convenios vencidos." />
          </section>
        </>
      )}
    </>
  );
}
