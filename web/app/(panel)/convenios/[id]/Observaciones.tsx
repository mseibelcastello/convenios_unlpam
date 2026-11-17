"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { leerError } from "@/lib/errores";

type Persona = { id: number; nombre: string } | null;

type Observacion = {
  id: number;
  contenido: string;
  autor: Persona;
  fecha: string | null;
  respuesta: string | null;
  respondida_por: Persona;
  respondida_en: string | null;
  resuelta: boolean;
  resuelta_por: Persona;
  resuelta_en: string | null;
};

type Props = {
  convenioId: number;
  estadoConvenio: string;
  // Avisa a la ficha cuántas quedan sin resolver, para mostrar el aviso arriba
  alContarPendientes: (cantidad: number) => void;
};

function fecha(texto: string | null) {
  if (!texto) return "";
  return new Date(texto).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function estadoDe(o: Observacion) {
  if (o.resuelta) return { clase: "obs-resuelta", texto: "Resuelta" };
  if (o.respuesta) return { clase: "obs-respondida", texto: "Respondida" };
  return { clase: "obs-pendiente", texto: "Sin responder" };
}

export default function Observaciones({ convenioId, estadoConvenio, alContarPendientes }: Props) {
  const { usuario } = useAuth();
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [recarga, setRecarga] = useState(0);
  const [nueva, setNueva] = useState("");
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState<string | null>(null);

  const rol = usuario?.rol;
  const enRevision = estadoConvenio === "revision";
  // Mismas reglas que la API: gestión responde en borrador o revisión; revisión anota y resuelve en revisión
  const puedeResponder = (rol === "gestion" || rol === "administracion") && ["borrador", "revision"].includes(estadoConvenio);
  const puedeResolver = rol === "revision" && enRevision;
  const puedeAnotar = rol === "revision" && enRevision;

  useEffect(() => {
    api.get(`/agreements/${convenioId}/observations`).then((r) => {
      const lista: Observacion[] = r.data.data;
      setObservaciones(lista);
      alContarPendientes(lista.filter((o) => !o.resuelta).length);
    });
    // Al cambiar el estado se vuelve a pedir: al devolver, la API crea una observación nueva
  }, [convenioId, estadoConvenio, recarga, alContarPendientes]);

  // Corre una acción contra la API; "clave" identifica qué botón está trabajando y dónde va el error
  async function ejecutar(clave: string, accion: () => Promise<unknown>, alTerminar?: () => void) {
    setEnviando(clave);
    setErrores({});
    try {
      await accion();
      alTerminar?.();
      setRecarga((n) => n + 1);
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrores({ [clave]: Object.values(campos)[0] ?? mensaje });
    } finally {
      setEnviando(null);
    }
  }

  function anotar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    ejecutar(
      "nueva",
      () => api.post(`/agreements/${convenioId}/observations`, { contenido: nueva }),
      () => setNueva(""),
    );
  }

  function responder(e: React.FormEvent<HTMLFormElement>, id: number) {
    e.preventDefault();
    ejecutar(
      `responder-${id}`,
      () => api.post(`/observations/${id}/reply`, { respuesta: respuestas[id] ?? "" }),
      () => setRespuestas((r) => ({ ...r, [id]: "" })),
    );
  }

  function resolver(id: number) {
    ejecutar(`resolver-${id}`, () => api.post(`/observations/${id}/resolve`));
  }

  const pendientes = observaciones.filter((o) => !o.resuelta).length;

  return (
    <section className="ficha-seccion" id="observaciones" aria-labelledby="titulo-observaciones">
      <h2 id="titulo-observaciones">
        Observaciones <span className="contador">{observaciones.length}</span>
        {pendientes > 0 && <span className="obs-estado obs-pendiente">{pendientes} sin resolver</span>}
      </h2>

      {observaciones.length === 0 && <p className="vacio">No hay observaciones.</p>}

      <ul className="obs-lista">
        {observaciones.map((o) => {
          const estado = estadoDe(o);
          const claveResp = `responder-${o.id}`;
          const claveRes = `resolver-${o.id}`;
          return (
            <li key={o.id} className={o.resuelta ? "resuelta" : ""}>
              <div className="obs-cabecera">
                <span className={`obs-estado ${estado.clase}`}>{estado.texto}</span>
                <small>
                  {o.autor?.nombre ?? "Revisión"} · {fecha(o.fecha)}
                </small>
              </div>

              <p className="obs-texto">{o.contenido}</p>

              {o.respuesta && (
                <div className="obs-respuesta">
                  <small>
                    Respuesta de {o.respondida_por?.nombre ?? "gestión"} · {fecha(o.respondida_en)}
                  </small>
                  <p>{o.respuesta}</p>
                </div>
              )}

              {o.resuelta && (
                <small className="obs-pie">
                  Resuelta por {o.resuelta_por?.nombre ?? "revisión"} · {fecha(o.resuelta_en)}
                </small>
              )}

              {/* Gestión responde una sola vez, mientras siga abierta */}
              {puedeResponder && !o.resuelta && !o.respuesta && (
                <form className="formulario obs-formulario" onSubmit={(e) => responder(e, o.id)}>
                  <div className="campo">
                    <label htmlFor={`respuesta-${o.id}`}>Tu respuesta</label>
                    <textarea
                      id={`respuesta-${o.id}`}
                      rows={3}
                      maxLength={2000}
                      required
                      value={respuestas[o.id] ?? ""}
                      onChange={(e) => setRespuestas({ ...respuestas, [o.id]: e.target.value })}
                      aria-invalid={errores[claveResp] ? true : undefined}
                      aria-describedby={errores[claveResp] ? `error-${claveResp}` : undefined}
                    />
                    {errores[claveResp] && (
                      <p className="campo-error" id={`error-${claveResp}`}>
                        {errores[claveResp]}
                      </p>
                    )}
                  </div>
                  <button type="submit" disabled={enviando === claveResp}>
                    {enviando === claveResp ? "Enviando…" : "Responder"}
                  </button>
                </form>
              )}

              {puedeResolver && !o.resuelta && (
                <div className="obs-acciones">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => resolver(o.id)}
                    disabled={enviando === claveRes}
                  >
                    {enviando === claveRes ? "Guardando…" : "Marcar como resuelta"}
                  </button>
                  {errores[claveRes] && (
                    <p className="campo-error" role="alert">
                      {errores[claveRes]}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {puedeAnotar && (
        <form className="formulario obs-formulario obs-nueva" onSubmit={anotar}>
          <div className="campo">
            <label htmlFor="observacion-nueva">Nueva observación</label>
            <textarea
              id="observacion-nueva"
              rows={3}
              maxLength={2000}
              required
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              aria-invalid={errores.nueva ? true : undefined}
              aria-describedby={errores.nueva ? "error-observacion-nueva" : undefined}
            />
            {errores.nueva && (
              <p className="campo-error" id="error-observacion-nueva">
                {errores.nueva}
              </p>
            )}
          </div>
          <button type="submit" disabled={enviando === "nueva"}>
            {enviando === "nueva" ? "Guardando…" : "Agregar observación"}
          </button>
        </form>
      )}
    </section>
  );
}
