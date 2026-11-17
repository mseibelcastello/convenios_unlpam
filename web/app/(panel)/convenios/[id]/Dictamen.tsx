"use client";

import { useState } from "react";
import Ventana from "@/components/Ventana";
import { api } from "@/lib/api";
import { leerError } from "@/lib/errores";

type Props = {
  convenioId: number;
  // Observaciones sin resolver: con alguna abierta la API no deja aprobar
  pendientes: number;
  // Se llama después de aprobar o devolver, con el mensaje para mostrar; la ficha se recarga
  alCambiar: (mensaje: string) => void;
};

// Las dos decisiones de revisión sobre un convenio en revisión: aprobarlo o devolverlo a borrador
export default function Dictamen({ convenioId, pendientes, alCambiar }: Props) {
  const [devolviendo, setDevolviendo] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [enviando, setEnviando] = useState<"aprobar" | "devolver" | null>(null);
  const [error, setError] = useState("");
  const [errorDevolver, setErrorDevolver] = useState("");

  async function aprobar() {
    setEnviando("aprobar");
    setError("");
    try {
      await api.post(`/agreements/${convenioId}/transition`, { estado: "aprobado" });
      alCambiar("El convenio quedó aprobado.");
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setError(campos.estado ?? mensaje);
    } finally {
      setEnviando(null);
    }
  }

  async function devolver(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando("devolver");
    setErrorDevolver("");
    try {
      // La API guarda el fundamento como observación para que gestión la responda
      await api.post(`/agreements/${convenioId}/transition`, { estado: "borrador", fundamento: observacion });
      setDevolviendo(false);
      setObservacion("");
      alCambiar("El convenio volvió a borrador con tu observación.");
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrorDevolver(campos.fundamento ?? campos.estado ?? mensaje);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section className="ficha-seccion dictamen">
      <h2>Revisión</h2>
      <p className="subtitulo">
        {pendientes > 0
          ? `Para aprobar, primero resolvé ${pendientes === 1 ? "la observación pendiente" : `las ${pendientes} observaciones pendientes`}.`
          : "Aprobalo si está en condiciones o devolvelo a gestión con una observación."}
      </p>

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      <div className="dictamen-botones">
        <button type="button" className="boton-aprobar" onClick={aprobar} disabled={enviando !== null || pendientes > 0}>
          {enviando === "aprobar" ? "Aprobando…" : "Aprobar"}
        </button>
        <button type="button" className="boton-secundario" onClick={() => setDevolviendo(true)} disabled={enviando !== null}>
          Devolver
        </button>
      </div>

      <Ventana abierta={devolviendo} titulo="Devolver a borrador" alCerrar={() => setDevolviendo(false)}>
        <form className="formulario" onSubmit={devolver}>
          <p>El convenio vuelve a gestión. Tu observación queda en la ficha para que la respondan.</p>
          <div className="campo">
            <label htmlFor="observacion-devolver">Observación *</label>
            <textarea
              id="observacion-devolver"
              rows={4}
              maxLength={1000}
              required
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              aria-invalid={errorDevolver ? true : undefined}
              aria-describedby={errorDevolver ? "error-devolver" : undefined}
            />
            {errorDevolver && (
              <p className="campo-error" id="error-devolver">
                {errorDevolver}
              </p>
            )}
          </div>
          <button type="submit" disabled={enviando === "devolver" || observacion.trim() === ""}>
            {enviando === "devolver" ? "Devolviendo…" : "Devolver a borrador"}
          </button>
        </form>
      </Ventana>
    </section>
  );
}
