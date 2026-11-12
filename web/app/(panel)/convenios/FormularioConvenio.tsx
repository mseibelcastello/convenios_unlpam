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
  { nombre: "objeto", etiqueta: "Objeto", tipo: "largo", obligatorio: true },
  { nombre: "alcance", etiqueta: "Alcance", tipo: "largo", obligatorio: true },
  { nombre: "obligaciones", etiqueta: "Obligaciones", tipo: "largo", obligatorio: true },
  { nombre: "condiciones_rescision", etiqueta: "Condiciones de rescisión", tipo: "largo", obligatorio: true },
  { nombre: "marco_legal", etiqueta: "Marco legal", tipo: "largo", obligatorio: true },
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
  // Hace el POST o el PUT. Si la API responde con error, se muestra en el formulario
  enviar: (datos: Record<string, string>) => Promise<void>;
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
    try {
      await enviar(valores);
    } catch (err) {
      const respuesta = isAxiosError(err) ? err.response : undefined;
      if (respuesta?.status === 422 && respuesta.data.errors) {
        // La API manda {campo: [mensajes]}; se muestra el primero bajo cada campo
        const nuevos: Record<string, string> = {};
        for (const campo in respuesta.data.errors) nuevos[campo] = respuesta.data.errors[campo][0];
        setErrores(nuevos);
        setMensaje("Revisá los campos marcados.");
      } else {
        setMensaje(respuesta?.data?.message ?? "No se pudo guardar.");
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

      {CAMPOS.map((c) => {
        const comun = {
          id: c.nombre,
          name: c.nombre,
          value: valores[c.nombre],
          onChange: cambiar,
          required: c.obligatorio,
          "aria-invalid": errores[c.nombre] ? true : undefined,
          "aria-describedby": errores[c.nombre] ? `error-${c.nombre}` : undefined,
        };

        return (
          <div className="campo" key={c.nombre}>
            <label htmlFor={c.nombre}>
              {c.etiqueta}
              {c.obligatorio && " *"}
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
