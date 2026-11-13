"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ESTADOS } from "@/lib/estados";
import { ROLES } from "@/lib/roles";

type ItemLista = { id: number; codigo: string; titulo: string; vencimiento: string };

// Lo que usamos de la respuesta de GET /dashboard
type Dashboard = {
  total: number;
  por_estado: Record<string, number>;
  firmados: { total: number; vigentes: number; vencidos: number };
  por_unidad: { sigla: string; nombre: string; total: number }[];
  por_anio_firma: { anio: number; total: number }[];
  // Consulta no recibe las personas
  personas_unicas: number | null;
  proximos_a_vencer: { dias: number; total: number; convenios: ItemLista[] };
  vencidos: { total: number; convenios: ItemLista[] };
};

type Dato = { nombre: string; etiqueta: string; total: number };

// Gráfico de barras, con una tabla con los mismos datos para quien no puede verlo
function Grafico({ titulo, columna, datos }: { titulo: string; columna: string; datos: Dato[] }) {
  return (
    <section className="ficha-seccion">
      <h2>{titulo}</h2>
      <div role="img" aria-label={`${titulo}: ${datos.map((d) => `${d.etiqueta} ${d.total}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-relleno)" />
            <XAxis dataKey="nombre" tick={{ fill: "var(--color-texto)" }} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--color-texto)" }} />
            <Tooltip />
            <Bar dataKey="total" name="Convenios" fill="var(--color-primario)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details>
        <summary>Ver los datos en una tabla</summary>
        <table className="tabla">
          <thead>
            <tr>
              <th>{columna}</th>
              <th>Convenios</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.nombre}>
                <td>{d.etiqueta}</td>
                <td>{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function Lista({ titulo, total, convenios }: { titulo: string; total: number; convenios: ItemLista[] }) {
  return (
    <section className="ficha-seccion">
      <h2>
        {titulo} ({total})
      </h2>
      {convenios.length === 0 && <p>Ninguno</p>}
      <ul>
        {convenios.map((c) => (
          <li key={c.id}>
            <Link href={`/convenios/${c.id}`}>
              {c.codigo} · {c.titulo}
            </Link>{" "}
            (vence el {c.vencimiento})
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Inicio() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState<Dashboard | null>(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setDatos(r.data));
  }, []);

  return (
    <>
      <h1>Hola, {usuario?.name}</h1>
      <p>
        Entraste como {usuario && ROLES[usuario.rol]}
        {usuario?.unidad ? ` de ${usuario.unidad.nombre}` : ""}.
      </p>

      {!datos && <p>Cargando…</p>}

      {datos && (
        <>
          <h2>Resumen</h2>
          <div className="tarjetas">
            <div className="tarjeta">
              <strong>{datos.total}</strong>
              <span>Convenios en total</span>
            </div>
            {Object.entries(datos.por_estado).map(([estado, cantidad]) => (
              <div className="tarjeta" key={estado}>
                <strong>{cantidad}</strong>
                <span>{ESTADOS[estado]}</span>
              </div>
            ))}
            <div className="tarjeta">
              <strong>{datos.firmados.vigentes}</strong>
              <span>Firmados vigentes</span>
            </div>
            <div className="tarjeta">
              <strong>{datos.firmados.vencidos}</strong>
              <span>Firmados vencidos</span>
            </div>
            {datos.personas_unicas !== null && (
              <div className="tarjeta">
                <strong>{datos.personas_unicas}</strong>
                <span>Personas únicas</span>
              </div>
            )}
          </div>

          <div className="graficos">
            <Grafico
              titulo="Convenios por unidad"
              columna="Unidad"
              datos={datos.por_unidad.map((u) => ({ nombre: u.sigla, etiqueta: `${u.sigla} · ${u.nombre}`, total: u.total }))}
            />
            <Grafico
              titulo="Convenios por año de firma"
              columna="Año"
              datos={datos.por_anio_firma.map((a) => ({ nombre: String(a.anio), etiqueta: String(a.anio), total: a.total }))}
            />
          </div>

          <Lista
            titulo={`Próximos a vencer (${datos.proximos_a_vencer.dias} días)`}
            total={datos.proximos_a_vencer.total}
            convenios={datos.proximos_a_vencer.convenios}
          />
          <Lista titulo="Vencidos" total={datos.vencidos.total} convenios={datos.vencidos.convenios} />
        </>
      )}
    </>
  );
}
