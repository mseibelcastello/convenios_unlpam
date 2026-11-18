"use client";

import { useState } from "react";
import Ventana from "@/components/Ventana";
import { api } from "@/lib/api";
import { leerError } from "@/lib/errores";

type Props = {
  convenioId: number;
  // "enviar": gestión manda un borrador a revisión; "firmar": administración registra la firma de un aprobado
  paso: "enviar" | "firmar";
  // Fechas ya cargadas en el convenio, para proponerlas al firmar
  fechas: { fecha_firma: string | null; fecha_inicio: string | null; fecha_vencimiento: string | null };
  // Se llama después del cambio, con el mensaje para mostrar; la ficha se recarga
  alCambiar: (mensaje: string) => void;
};

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Los pasos del circuito que no son de revisión: enviar a revisión y registrar la firma.
// La firma con trazo y ubicación se hace desde la app móvil; desde la web se registran las fechas.
export default function Tramite({ convenioId, paso, fechas, alCambiar }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [firmando, setFirmando] = useState(false);
  const [form, setForm] = useState({
    fecha_firma: fechas.fecha_firma ?? hoy(),
    fecha_inicio: fechas.fecha_inicio ?? fechas.fecha_firma ?? hoy(),
    fecha_vencimiento: fechas.fecha_vencimiento ?? "",
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  async function enviarARevision() {
    setEnviando(true);
    setError("");
    try {
      await api.post(`/agreements/${convenioId}/transition`, { estado: "revision" });
      alCambiar("El convenio se envió a revisión.");
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setError(campos.estado ?? mensaje);
    } finally {
      setEnviando(false);
    }
  }

  async function firmar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    try {
      await api.post(`/agreements/${convenioId}/transition`, {
        estado: "firmado",
        fecha_firma: form.fecha_firma,
        fecha_inicio: form.fecha_inicio,
        fecha_vencimiento: form.fecha_vencimiento || null,
      });
      setFirmando(false);
      alCambiar("La firma quedó registrada y el convenio está firmado.");
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrores(Object.keys(campos).length ? campos : { general: mensaje });
    } finally {
      setEnviando(false);
    }
  }

  function cambiar(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  const campo = (nombre: string) => ({
    "aria-invalid": errores[nombre] ? true : undefined,
    "aria-describedby": errores[nombre] ? `error-${nombre}` : undefined,
  });
  const mensaje = (nombre: string) =>
    errores[nombre] && (
      <p className="campo-error" id={`error-${nombre}`}>
        {errores[nombre]}
      </p>
    );

  if (paso === "enviar") {
    return (
      <section className="ficha-seccion dictamen">
        <h2>Enviar a revisión</h2>
        <p className="subtitulo">Cuando el borrador esté completo, mandalo a revisión. Mientras esté en revisión no se puede editar.</p>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <div className="dictamen-botones">
          <button type="button" className="boton-aprobar" onClick={enviarARevision} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar a revisión"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ficha-seccion dictamen">
      <h2>Firma</h2>
      <p className="subtitulo">
        El convenio está aprobado. Registrá la firma con sus fechas (la firma con trazo y ubicación se hace desde la app móvil).
      </p>
      <div className="dictamen-botones">
        <button type="button" className="boton-aprobar" onClick={() => setFirmando(true)} disabled={enviando}>
          Registrar firma
        </button>
      </div>

      <Ventana abierta={firmando} titulo="Registrar firma" alCerrar={() => setFirmando(false)}>
        <form className="formulario" onSubmit={firmar}>
          {(errores.general || errores.estado) && (
            <p className="login-error" role="alert">
              {errores.estado ?? errores.general}
            </p>
          )}
          <div className="campo">
            <label htmlFor="fecha_firma">Fecha de firma *</label>
            <input id="fecha_firma" name="fecha_firma" type="date" required value={form.fecha_firma} onChange={cambiar} {...campo("fecha_firma")} />
            {mensaje("fecha_firma")}
          </div>
          <div className="campo">
            <label htmlFor="fecha_inicio">Inicio de vigencia *</label>
            <input id="fecha_inicio" name="fecha_inicio" type="date" required value={form.fecha_inicio} onChange={cambiar} {...campo("fecha_inicio")} />
            {mensaje("fecha_inicio")}
          </div>
          <div className="campo">
            <label htmlFor="fecha_vencimiento">Vencimiento (opcional)</label>
            <input id="fecha_vencimiento" name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={cambiar} {...campo("fecha_vencimiento")} />
            {mensaje("fecha_vencimiento")}
          </div>
          <button type="submit" disabled={enviando}>
            {enviando ? "Registrando…" : "Confirmar firma"}
          </button>
        </form>
      </Ventana>
    </section>
  );
}
