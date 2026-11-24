"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ESTADOS } from "@/lib/estados";
import { diasHasta } from "@/lib/fechas";
import { ROLES } from "@/lib/roles";
import ListaConvenios from "@/components/ListaConvenios";
import ListaPersonas from "@/components/ListaPersonas";

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

// Tarjeta del resumen: un botón que abre la lista de convenios que cuenta
function Tarjeta({ clase, cantidad, texto, alAbrir, verTexto = "Ver convenios →" }: { clase: string; cantidad: number; texto: string; alAbrir: () => void; verTexto?: string }) {
  return (
    <button type="button" className={`tarjeta ${clase}`} onClick={alAbrir} aria-label={`${texto}: ${cantidad}. ${verTexto.replace(" →", "")}`}>
      <strong>{cantidad}</strong>
      <span>{texto}</span>
      <span className="tarjeta-ver" aria-hidden="true">{verTexto}</span>
    </button>
  );
}

function saludoSegunHora() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Buen día";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// Una línea con lo que importa hoy: lo vencido y lo que está por vencer
function resumenDelDia(d: Dashboard) {
  const vencidos = d.vencidos.total;
  const porVencer = d.proximos_a_vencer.total;
  if (vencidos === 0 && porVencer === 0) return "Todo al día: no hay convenios vencidos ni por vencer.";
  const partes = [];
  if (vencidos > 0) partes.push(plural(vencidos, "convenio vencido", "convenios vencidos"));
  if (porVencer > 0) partes.push(`${plural(porVencer, "convenio", "convenios")} por vencer en los próximos ${d.proximos_a_vencer.dias} días`);
  return `Tenés ${partes.join(" y ")}.`;
}

// Gráfico de barras, con una tabla con los mismos datos para quien no puede verlo
function Grafico({ titulo, columna, datos }: { titulo: string; columna: string; datos: Dato[] }) {
  const id = `barra-${useId().replace(/:/g, "")}`;
  return (
    <section className="ficha-seccion">
      <h2>{titulo}</h2>
      <div role="img" aria-label={`${titulo}: ${datos.map((d) => `${d.etiqueta} ${d.total}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datos}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff8a3d" />
                <stop offset="100%" stopColor="#c8181c" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(46, 21, 25, 0.12)" vertical={false} />
            <XAxis dataKey="nombre" interval={0} angle={-30} textAnchor="end" height={50} tick={{ fill: "var(--color-texto-suave)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "var(--color-texto-suave)" }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(232, 106, 4, 0.08)" }}
              contentStyle={{ background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(232, 106, 4, 0.35)", borderRadius: 10 }}
              labelStyle={{ color: "#2e1519" }}
              itemStyle={{ color: "#8a4300" }}
            />
            <Bar dataKey="total" name="Convenios" fill={`url(#${id})`} radius={[6, 6, 0, 0]} />
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

// Cada convenio con una insignia que dice cuánto falta (o cuánto hace que venció)
function Lista({ titulo, total, convenios }: { titulo: string; total: number; convenios: ItemLista[] }) {
  return (
    <section className="ficha-seccion">
      <h2>
        {titulo} <span className="contador">{total}</span>
      </h2>
      {convenios.length === 0 && <p className="vacio">Ninguno por ahora.</p>}
      <ul className="filas">
        {convenios.map((c) => {
          const dias = diasHasta(c.vencimiento);
          const clase = dias < 0 ? "urgencia-vencido" : dias <= 30 ? "urgencia-pronto" : "urgencia-ok";
          const texto = dias < 0 ? `Venció hace ${-dias} d` : dias === 0 ? "Vence hoy" : `Vence en ${dias} d`;
          return (
            <li key={c.id}>
              <Link href={`/convenios/${c.id}`}>
                <strong>{c.codigo}</strong>
                <span>{c.titulo}</span>
              </Link>
              <span className={`urgencia ${clase}`} title={`Vencimiento: ${c.vencimiento}`}>
                {texto}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Inicio() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState<Dashboard | null>(null);
  // Tarjeta tocada: su lista de convenios se muestra en una ventana
  const [verPersonas, setVerPersonas] = useState(false);
  const [abierta, setAbierta] = useState<{ titulo: string; filtros: Record<string, string> } | null>(null);

  useEffect(() => {
    api.get("/dashboard").then((r) => setDatos(r.data));
  }, []);

  return (
    <>
      <h1>
        {saludoSegunHora()}, {usuario?.name.split(" ")[0]}
      </h1>
      <p className="subtitulo">
        {datos ? (
          resumenDelDia(datos)
        ) : (
          <>
            Entraste como {usuario && ROLES[usuario.rol]}
            {usuario?.unidad ? ` de ${usuario.unidad.nombre}` : ""}.
          </>
        )}
      </p>

      {!datos && (
        <div className="tarjetas" aria-busy="true" aria-label="Cargando resumen">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="tarjeta esqueleto" key={i} />
          ))}
        </div>
      )}

      {datos && (
        <>
          <h2>Resumen</h2>
          <div className="tarjetas">
            <Tarjeta clase="tarjeta-total" cantidad={datos.total} texto="Convenios en total" alAbrir={() => setAbierta({ titulo: "Todos los convenios", filtros: {} })} />
            {Object.entries(datos.por_estado).map(([estado, cantidad]) => (
              <Tarjeta
                key={estado}
                clase={`estado-${estado}`}
                cantidad={cantidad}
                texto={ESTADOS[estado]}
                alAbrir={() => setAbierta({ titulo: ESTADOS[estado], filtros: { estado } })}
              />
            ))}
            <Tarjeta
              clase="estado-firmado"
              cantidad={datos.firmados.vigentes}
              texto="Firmados vigentes"
              alAbrir={() => setAbierta({ titulo: "Firmados vigentes", filtros: { vigencia: "vigente" } })}
            />
            <Tarjeta
              clase="estado-rescindido"
              cantidad={datos.firmados.vencidos}
              texto="Firmados vencidos"
              alAbrir={() => setAbierta({ titulo: "Firmados vencidos", filtros: { vigencia: "vencido" } })}
            />
            {datos.personas_unicas !== null && (
              <Tarjeta clase="" cantidad={datos.personas_unicas} texto="Personas únicas" alAbrir={() => setVerPersonas(true)} verTexto="Ver personas →" />
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

          <div className="graficos">
            <Lista
              titulo={`Próximos a vencer (${datos.proximos_a_vencer.dias} días)`}
              total={datos.proximos_a_vencer.total}
              convenios={datos.proximos_a_vencer.convenios}
            />
            <Lista titulo="Vencidos" total={datos.vencidos.total} convenios={datos.vencidos.convenios} />
          </div>
        </>
      )}

      <ListaPersonas abierta={verPersonas} alCerrar={() => setVerPersonas(false)} />
      <ListaConvenios
        abierta={abierta !== null}
        titulo={abierta?.titulo ?? ""}
        filtros={abierta?.filtros ?? {}}
        alCerrar={() => setAbierta(null)}
      />
    </>
  );
}
