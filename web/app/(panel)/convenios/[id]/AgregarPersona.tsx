"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { leerError } from "@/lib/errores";
import { ROLES_PERSONA } from "@/lib/tipos";

type PersonaExistente = { id: number; nombre: string; legajo: string | null };

type Props = {
  convenioId: number;
  // Se llama cuando la persona se agregó, para que la ficha se vuelva a cargar
  alGuardar: () => void;
};

const VACIOS = {
  persona_id: "",
  nombre: "",
  legajo: "",
  rol: "",
  desde: "",
  hasta: "",
  carrera: "",
  tutor: "",
  carga_horaria: "",
  asignacion: "",
  seguro: "",
};

export default function AgregarPersona({ convenioId, alGuardar }: Props) {
  // Arranca en "nueva": la lista de personas existentes se pide solo si se elige esa opción
  const [modo, setModo] = useState<"existente" | "nueva">("nueva");
  const [personas, setPersonas] = useState<PersonaExistente[]>([]);
  const [valores, setValores] = useState(VACIOS);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");

  const esPasante = valores.rol === "pasante";

  useEffect(() => {
    if (modo === "existente") {
      api.get("/people").then((r) => setPersonas(r.data.data));
    }
  }, [modo]);

  function cambiar(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setValores({ ...valores, [e.target.name]: e.target.value });
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores({});
    setMensaje("");
    try {
      let id = valores.persona_id;
      // Una persona nueva se crea primero y después se une al convenio
      if (modo === "nueva") {
        const r = await api.post("/people", { nombre: valores.nombre, legajo: valores.legajo });
        id = r.data.id;
      }

      const datos: Record<string, string> = {
        persona_id: id,
        rol: valores.rol,
        desde: valores.desde,
        hasta: valores.hasta,
      };
      // Los datos de pasantía solo se mandan si el rol es pasante
      if (esPasante) {
        for (const campo of ["carrera", "tutor", "carga_horaria", "asignacion", "seguro"] as const) {
          datos[campo] = valores[campo];
        }
      }
      await api.post(`/agreements/${convenioId}/people`, datos);

      setValores(VACIOS);
      alGuardar();
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrores(campos);
      // Si el error ya sale bajo un campo, no se repite arriba
      setMensaje(Object.keys(campos).length > 0 ? "" : mensaje);
    }
  }

  // Un campo de texto, número o fecha, con su etiqueta y su error
  function campo(nombre: keyof typeof VACIOS, etiqueta: string, tipo: string, obligatorio: boolean) {
    return (
      <div className="campo">
        <label htmlFor={`persona-${nombre}`}>
          {etiqueta}
          {obligatorio && " *"}
        </label>
        <input
          id={`persona-${nombre}`}
          name={nombre}
          type={tipo}
          value={valores[nombre]}
          onChange={cambiar}
          required={obligatorio}
          step={nombre === "asignacion" ? "0.01" : undefined}
          aria-invalid={errores[nombre] ? true : undefined}
          aria-describedby={errores[nombre] ? `error-persona-${nombre}` : undefined}
        />
        {errores[nombre] && (
          <p className="campo-error" id={`error-persona-${nombre}`}>
            {errores[nombre]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="agregar">
      <h3>Agregar persona</h3>

      <fieldset className="modo">
        <legend>¿Qué persona querés agregar?</legend>
        <label>
          <input type="radio" name="modo-persona" checked={modo === "nueva"} onChange={() => setModo("nueva")} />
          Una persona nueva
        </label>
        <label>
          <input type="radio" name="modo-persona" checked={modo === "existente"} onChange={() => setModo("existente")} />
          Una persona que ya existe
        </label>
      </fieldset>

      <form className="formulario" onSubmit={guardar}>
        {mensaje && (
          <p className="login-error" role="alert">
            {mensaje}
          </p>
        )}

        {modo === "existente" && (
          <div className="campo">
            <label htmlFor="persona-persona_id">Persona *</label>
            <select
              id="persona-persona_id"
              name="persona_id"
              value={valores.persona_id}
              onChange={cambiar}
              required
              aria-invalid={errores.persona_id ? true : undefined}
              aria-describedby={errores.persona_id ? "error-persona-persona_id" : undefined}
            >
              <option value="">Elegí una persona</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.legajo && ` (${p.legajo})`}
                </option>
              ))}
            </select>
            {errores.persona_id && (
              <p className="campo-error" id="error-persona-persona_id">
                {errores.persona_id}
              </p>
            )}
          </div>
        )}

        {modo === "nueva" && (
          <>
            {campo("nombre", "Nombre y apellido", "text", true)}
            {campo("legajo", "Legajo (ej: LEG-0001)", "text", false)}
          </>
        )}

        <div className="campo">
          <label htmlFor="persona-rol">Rol en el convenio *</label>
          <select
            id="persona-rol"
            name="rol"
            value={valores.rol}
            onChange={cambiar}
            required
            aria-invalid={errores.rol ? true : undefined}
            aria-describedby={errores.rol ? "error-persona-rol" : undefined}
          >
            <option value="">Elegí un rol</option>
            {Object.entries(ROLES_PERSONA).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          {errores.rol && (
            <p className="campo-error" id="error-persona-rol">
              {errores.rol}
            </p>
          )}
        </div>

        {campo("desde", "Desde", "date", esPasante)}
        {campo("hasta", "Hasta", "date", esPasante)}

        {esPasante && (
          <>
            <p>Para pasantes la API pide estos datos (la pasantía dura entre 2 y 12 meses).</p>
            {campo("carrera", "Carrera", "text", true)}
            {campo("tutor", "Tutor", "text", true)}
            {campo("carga_horaria", "Carga horaria semanal (1 a 20)", "number", true)}
            {campo("asignacion", "Asignación", "number", true)}
            {campo("seguro", "Seguro", "text", true)}
          </>
        )}

        <button type="submit">Agregar persona</button>
      </form>
    </div>
  );
}
