"use client";

import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TIPOS } from "@/lib/tipos";


// Todos los campos del convenio, en el orden en que se muestran
const CAMPOS = [
  { nombre: "codigo", etiqueta: "Código (ej: CONV-2026-001)", tipo: "texto", obligatorio: true },
  { nombre: "titulo", etiqueta: "Título", tipo: "texto", obligatorio: true },
  { nombre: "tipo", etiqueta: "Tipo", tipo: "tipo", obligatorio: true },
  { nombre: "unidad_id", etiqueta: "Unidad", tipo: "unidad", obligatorio: true },
  // "contenido": el texto del convenio. Si se carga el PDF, ya está en el PDF y no se pide.
  { nombre: "objeto", etiqueta: "Objeto", tipo: "largo", obligatorio: true, contenido: true },
  { nombre: "alcance", etiqueta: "Alcance", tipo: "largo", obligatorio: true, contenido: true },
  { nombre: "obligaciones", etiqueta: "Obligaciones", tipo: "largo", obligatorio: true, contenido: true },
  { nombre: "condiciones_rescision", etiqueta: "Condiciones de rescisión", tipo: "largo", obligatorio: true, contenido: true },
  { nombre: "marco_legal", etiqueta: "Marco legal", tipo: "largo", obligatorio: true, contenido: true },
  { nombre: "resolucion", etiqueta: "Resolución", tipo: "texto", obligatorio: false },
  { nombre: "expediente", etiqueta: "Expediente", tipo: "texto", obligatorio: false },
  { nombre: "condiciones_renovacion", etiqueta: "Condiciones de renovación", tipo: "largo", obligatorio: false },
  { nombre: "confidencialidad", etiqueta: "Confidencialidad", tipo: "largo", obligatorio: false },
  { nombre: "notas", etiqueta: "Notas", tipo: "largo", obligatorio: false },
  { nombre: "fecha_firma", etiqueta: "Fecha de firma", tipo: "fecha", obligatorio: false },
  { nombre: "fecha_inicio", etiqueta: "Fecha de inicio", tipo: "fecha", obligatorio: false },
  { nombre: "fecha_vencimiento", etiqueta: "Fecha de vencimiento", tipo: "fecha", obligatorio: false },
  { nombre: "fecha_preaviso", etiqueta: "Fecha de preaviso", tipo: "fecha", obligatorio: false },
];

type Unidad = { id: number; nombre: string; sigla: string };

type Props = {
  // Valores de un convenio existente (al editar); vacío al crear
  inicial?: Record<string, unknown>;
  // Hace el POST o el PUT. Si la API responde con error, se muestra en el formulario.
  // El archivo (PDF) solo se pide al crear; al editar llega null.
  enviar: (datos: Record<string, string>, archivo: File | null) => Promise<void>;
};

export default function FormularioConvenio({ inicial, enviar }: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      CAMPOS.map((c) => {
        const v = String(inicial?.[c.nombre] ?? "");
        // Las fechas pueden llegar con hora; el input solo quiere AAAA-MM-DD
        return [c.nombre, c.tipo === "fecha" ? v.slice(0, 10) : v];
      })
    )
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
  const esAlta = !inicial;
  // Al crear se elige cómo cargar el convenio: con su PDF o completando todos los campos
  const [modo, setModo] = useState<"pdf" | "formulario">("pdf");
  const conPdf = esAlta && modo === "pdf";

  useEffect(() => {
    api.get("/unidades").then((r) => setUnidades(r.data));
  }, []);

  function cambiar(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setValores({ ...valores, [e.target.name]: e.target.value });
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores({});
    setMensaje("");

    // La API también lo controla; acá se avisa antes de mandar
    if (conPdf && archivo && (archivo.type !== "application/pdf" || archivo.size > 20 * 1024 * 1024)) {
      setErrores({ archivo: "Tiene que ser un PDF de hasta 20 MB." });
      return;
    }

    // Con el PDF no se mandan los campos de contenido
    const datos = { ...valores };
    if (conPdf) {
      for (const c of CAMPOS) if (c.contenido) delete datos[c.nombre];
    }

    try {
      await enviar(datos, conPdf ? archivo : null);
    } catch (err) {
      const respuesta = isAxiosError(err) ? err.response : undefined;
      if (respuesta?.status === 422 && respuesta.data.errors) {
        // La API manda {campo: [mensajes]}; se muestra el primero bajo cada campo
        const nuevos: Record<string, string> = {};
        for (const campo in respuesta.data.errors) nuevos[campo] = respuesta.data.errors[campo][0];
        setErrores(nuevos);
        setMensaje("Revisá los campos marcados.");
      } else {
        setMensaje(respuesta?.data?.message ?? (err instanceof Error ? err.message : "No se pudo guardar."));
      }
    }
  }

  return (
    <form className="formulario" onSubmit={guardar}>
      {mensaje && (
        <p className="login-error" role="alert">
          {mensaje}
        </p>
      )}
      <p>Los campos con * son obligatorios.</p>

      {esAlta && (
        <fieldset className="modo">
          <legend>¿Cómo querés cargar el convenio?</legend>
          <label>
            <input type="radio" name="modo" checked={modo === "pdf"} onChange={() => setModo("pdf")} />
            Con el PDF del convenio
          </label>
          <label>
            <input type="radio" name="modo" checked={modo === "formulario"} onChange={() => setModo("formulario")} />
            Completando el formulario
          </label>
        </fieldset>
      )}

      {conPdf && (
        <div className="campo">
          <label htmlFor="archivo">PDF del convenio (hasta 20 MB) *</label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept=".pdf,application/pdf"
            required
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            aria-invalid={errores.archivo ? true : undefined}
            aria-describedby={errores.archivo ? "error-archivo" : undefined}
          />
          {errores.archivo && (
            <p className="campo-error" id="error-archivo">
              {errores.archivo}
            </p>
          )}
        </div>
      )}

      {CAMPOS.map((c) => {
        // Con el PDF no se piden los campos de contenido. Al completar el formulario son
        // obligatorios; al editar no, porque un convenio cargado con PDF puede no tenerlos.
        if (c.contenido && conPdf) return null;
        const obligatorio = c.contenido ? esAlta : c.obligatorio;

        const comun = {
          id: c.nombre,
          name: c.nombre,
          value: valores[c.nombre],
          onChange: cambiar,
          required: obligatorio,
          "aria-invalid": errores[c.nombre] ? true : undefined,
          "aria-describedby": errores[c.nombre] ? `error-${c.nombre}` : undefined,
        };

        return (
          <div className="campo" key={c.nombre}>
            <label htmlFor={c.nombre}>
              {c.etiqueta}
              {obligatorio && " *"}
            </label>

            {c.tipo === "largo" && <textarea rows={3} {...comun} />}
            {c.tipo === "texto" && <input type="text" {...comun} />}
            {c.tipo === "fecha" && <input type="date" {...comun} />}
            {c.tipo === "tipo" && (
              <select {...comun}>
                <option value="">Elegí un tipo</option>
                {Object.entries(TIPOS).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            )}
            {c.tipo === "unidad" && (
              <select {...comun}>
                <option value="">Elegí una unidad</option>
                <optgroup label="Facultades">
                  {unidades
                    .filter((u) => !u.nombre.startsWith("Secretaría"))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.sigla} · {u.nombre}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Secretarías">
                  {unidades
                    .filter((u) => u.nombre.startsWith("Secretaría"))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.sigla} · {u.nombre}
                      </option>
                    ))}
                </optgroup>
              </select>
            )}

            {errores[c.nombre] && (
              <p className="campo-error" id={`error-${c.nombre}`}>
                {errores[c.nombre]}
              </p>
            )}
          </div>
        );
      })}

      <button type="submit">Guardar</button>
    </form>
  );
}
