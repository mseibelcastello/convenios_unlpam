"use client";

import Link from "next/link";
import { useState } from "react";
import { leerError } from "@/lib/errores";
import { ESTADOS } from "@/lib/estados";
import { type CambioPendiente, descartarCambio, quedarmeConLoMio, useCola } from "@/lib/local";
import { TIPOS } from "@/lib/tipos";
import { CAMPOS } from "../convenios/FormularioConvenio";

// Un valor como se ve en pantalla: fechas sin hora, la unidad con su nombre, vacío como "(vacío)"
function mostrar(campo: string, valor: unknown, servidor?: Record<string, unknown>) {
  if (valor === null || valor === undefined || valor === "") return null;
  const texto = String(valor);
  if (campo.startsWith("fecha_")) return texto.slice(0, 10).split("-").reverse().join("/");
  if (campo === "tipo") return TIPOS[texto] ?? texto;
  if (campo === "unidad_id") {
    const unidad = servidor?.unidad as { id: number; nombre: string } | undefined;
    if (unidad && String(unidad.id) === texto) return unidad.nombre;
    try {
      const lista: { id: number; nombre: string }[] = JSON.parse(localStorage.getItem("unidades") ?? "[]");
      return lista.find((u) => String(u.id) === texto)?.nombre ?? texto;
    } catch {
      return texto;
    }
  }
  return texto;
}

// Para comparar: mismas reglas que al mostrar, sin el formato
function normal(campo: string, valor: unknown) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  return campo.startsWith("fecha_") ? texto.slice(0, 10) : texto.trim();
}

function Conflicto({ cambio }: { cambio: CambioPendiente }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [verTodos, setVerTodos] = useState(false);

  const mio = cambio.datos ?? {};
  const servidor = cambio.servidor ?? {};
  // Solo se puede insistir con lo mío si el convenio sigue en borrador (si no, la API lo vuelve a rechazar)
  const sigueEnBorrador = servidor.estado === "borrador";

  const filas = CAMPOS.filter((c) => c.nombre in mio).map((c) => ({
    ...c,
    mio: mostrar(c.nombre, mio[c.nombre], servidor),
    delServidor: mostrar(c.nombre, servidor[c.nombre], servidor),
    distinto: normal(c.nombre, mio[c.nombre]) !== normal(c.nombre, servidor[c.nombre]),
  }));
  const distintas = filas.filter((f) => f.distinto);
  const visibles = verTodos ? filas : distintas;

  async function usarLoMio() {
    setEnviando(true);
    setError("");
    try {
      await quedarmeConLoMio(cambio);
    } catch (err) {
      // Sin conexión: queda pendiente y se manda cuando vuelva la red
      setError(leerError(err).mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="ficha-seccion conflicto">
      <header className="conflicto-cabecera">
        <div>
          <Link href={`/convenios/${cambio.convenio_id}`} className="codigo">
            {String(servidor.codigo ?? mio.codigo ?? `Convenio ${cambio.convenio_id}`)}
          </Link>
          <h2>{String(servidor.titulo ?? mio.titulo ?? "")}</h2>
        </div>
        {typeof servidor.estado === "string" && (
          <span className={`insignia insignia-${servidor.estado}`}>{ESTADOS[servidor.estado]}</span>
        )}
      </header>

      <p className="conflicto-motivo">
        {cambio.motivo}. Mientras estabas sin conexión, alguien más guardó cambios en este convenio.
        {distintas.length > 0
          ? ` ${distintas.length === 1 ? "Hay 1 campo distinto" : `Hay ${distintas.length} campos distintos`}: elegí con qué versión te quedás.`
          : " Los campos que editaste quedaron iguales en las dos versiones."}
      </p>

      {visibles.length > 0 && (
        <div className="tabla-desplazable">
          <table className="tabla tabla-conflicto">
            <thead>
              <tr>
                <th>Campo</th>
                <th>Lo mío (sin conexión)</th>
                <th>Lo del servidor (versión {String(servidor.version ?? "?")})</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((f) => (
                <tr key={f.nombre} className={f.distinto ? "distinto" : ""}>
                  <th scope="row">{f.etiqueta}</th>
                  <td>{f.mio ?? <span className="sin-dato">(vacío)</span>}</td>
                  <td>{f.delServidor ?? <span className="sin-dato">(vacío)</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filas.length > distintas.length && (
        <button type="button" className="boton-texto" onClick={() => setVerTodos(!verTodos)}>
          {verTodos ? "Ver solo los campos distintos" : "Ver todos los campos"}
        </button>
      )}

      {!sigueEnBorrador && (
        <p className="conflicto-motivo">
          El convenio ya no está en borrador, así que tu versión no se puede aplicar. Solo queda descartarla.
        </p>
      )}
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      <div className="conflicto-botones">
        {sigueEnBorrador && (
          <button type="button" className="boton-aprobar" onClick={usarLoMio} disabled={enviando}>
            {enviando ? "Enviando…" : "Quedarme con lo mío"}
          </button>
        )}
        <button type="button" className="boton-secundario" onClick={() => descartarCambio(cambio)} disabled={enviando}>
          Quedarme con lo del servidor
        </button>
      </div>
    </article>
  );
}

function Rechazado({ cambio }: { cambio: CambioPendiente }) {
  return (
    <article className="ficha-seccion conflicto">
      <header className="conflicto-cabecera">
        <div>
          <Link href={`/convenios/${cambio.convenio_id}`} className="codigo">
            {String(cambio.datos?.codigo ?? `Convenio ${cambio.convenio_id}`)}
          </Link>
          <h2>{cambio.tipo === "comentario" ? "Comentario" : "Edición"} que el servidor no aceptó</h2>
        </div>
      </header>
      <p className="conflicto-motivo">{cambio.motivo}.</p>
      <div className="conflicto-botones">
        <button type="button" className="boton-secundario" onClick={() => descartarCambio(cambio)}>
          Descartar
        </button>
      </div>
    </article>
  );
}

export default function Conflictos() {
  const { porResolver, pendientes } = useCola();

  return (
    <>
      <h1>
        Cambios sin conexión <span className="contador">{porResolver.length}</span>
      </h1>
      <p className="subtitulo">
        Lo que editaste sin red y no se pudo aplicar solo. Para cada uno, elegí con qué versión te quedás.
      </p>

      {pendientes.length > 0 && (
        <p className="aviso-pendientes" role="status">
          {pendientes.length === 1 ? "1 cambio está esperando conexión para enviarse." : `${pendientes.length} cambios están esperando conexión para enviarse.`}
        </p>
      )}

      {porResolver.length === 0 && (
        <div className="vacio-grande">
          <strong>No hay nada para resolver</strong>
          <span>Todos los cambios hechos sin conexión se aplicaron.</span>
        </div>
      )}

      {porResolver.map((c) =>
        c.estado === "conflicto" ? <Conflicto key={c.id} cambio={c} /> : <Rechazado key={c.id} cambio={c} />,
      )}
    </>
  );
}
