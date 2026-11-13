"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { leerError } from "@/lib/errores";
import { PARTES, ROLES_PARTE } from "@/lib/tipos";

type ParteExistente = { id: number; nombre: string; tipo: string };

type Props = {
  convenioId: number;
  // Se llama cuando la parte se agregó, para que la ficha se vuelva a cargar
  alGuardar: () => void;
};

const NUEVA_VACIA = { nombre: "", tipo: "", representante: "", cargo_representante: "" };

export default function AgregarParte({ convenioId, alGuardar }: Props) {
  // Se puede elegir una parte que ya existe o crear una nueva
  const [modo, setModo] = useState<"existente" | "nueva">("existente");
  const [resultados, setResultados] = useState<ParteExistente[]>([]);
  const [parteId, setParteId] = useState("");
  const [nueva, setNueva] = useState(NUEVA_VACIA);
  const [rolParte, setRolParte] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");

  // Al elegir "una parte que ya existe" se carga la lista de partes
  useEffect(() => {
    if (modo === "existente") {
      api.get("/parties").then((r) => setResultados(r.data.data));
    }
  }, [modo]);

  function cambiarNueva(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setNueva({ ...nueva, [e.target.name]: e.target.value });
  }

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrores({});
    setMensaje("");
    try {
      let id = parteId;
      // Una parte nueva se crea primero y después se une al convenio
      if (modo === "nueva") {
        const r = await api.post("/parties", nueva);
        id = r.data.id;
      }
      await api.post(`/agreements/${convenioId}/parties`, { parte_id: id, rol_parte: rolParte });

      setParteId("");
      setNueva(NUEVA_VACIA);
      setRolParte("");
      alGuardar();
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrores(campos);
      // Si el error ya sale bajo un campo, no se repite arriba
      setMensaje(Object.keys(campos).length > 0 ? "" : mensaje);
    }
  }

  // Un campo de texto de la parte nueva, con su etiqueta y su error
  function campoTexto(nombre: "nombre" | "representante" | "cargo_representante", etiqueta: string, obligatorio: boolean) {
    return (
      <div className="campo">
        <label htmlFor={`parte-${nombre}`}>
          {etiqueta}
          {obligatorio && " *"}
        </label>
        <input
          id={`parte-${nombre}`}
          name={nombre}
          value={nueva[nombre]}
          onChange={cambiarNueva}
          required={obligatorio}
          aria-invalid={errores[nombre] ? true : undefined}
          aria-describedby={errores[nombre] ? `error-parte-${nombre}` : undefined}
        />
        {errores[nombre] && (
          <p className="campo-error" id={`error-parte-${nombre}`}>
            {errores[nombre]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="agregar">
      <h3>Agregar parte</h3>

      <fieldset className="modo">
        <legend>¿Qué parte querés agregar?</legend>
        <label>
          <input type="radio" name="modo-parte" checked={modo === "existente"} onChange={() => setModo("existente")} />
          Una parte que ya existe
        </label>
        <label>
          <input type="radio" name="modo-parte" checked={modo === "nueva"} onChange={() => setModo("nueva")} />
          Una parte nueva
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
            <label htmlFor="parte-existente">Parte *</label>
            <select
              id="parte-existente"
              value={parteId}
              onChange={(e) => setParteId(e.target.value)}
              required
              aria-invalid={errores.parte_id ? true : undefined}
              aria-describedby={errores.parte_id ? "error-parte-id" : undefined}
            >
              <option value="">Elegí una parte</option>
              {resultados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({PARTES[p.tipo]})
                </option>
              ))}
            </select>
            {errores.parte_id && (
              <p className="campo-error" id="error-parte-id">
                {errores.parte_id}
              </p>
            )}
          </div>
        )}

        {modo === "nueva" && (
          <>
            {campoTexto("nombre", "Nombre de la institución", true)}
            <div className="campo">
              <label htmlFor="parte-tipo">Tipo *</label>
              <select
                id="parte-tipo"
                name="tipo"
                value={nueva.tipo}
                onChange={cambiarNueva}
                required
                aria-invalid={errores.tipo ? true : undefined}
                aria-describedby={errores.tipo ? "error-parte-tipo" : undefined}
              >
                <option value="">Elegí un tipo</option>
                {Object.entries(PARTES).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
              {errores.tipo && (
                <p className="campo-error" id="error-parte-tipo">
                  {errores.tipo}
                </p>
              )}
            </div>
            {campoTexto("representante", "Representante", false)}
            {campoTexto("cargo_representante", "Cargo del representante", false)}
          </>
        )}

        <div className="campo">
          <label htmlFor="rol-parte">Rol en el convenio *</label>
          <select
            id="rol-parte"
            value={rolParte}
            onChange={(e) => setRolParte(e.target.value)}
            required
            aria-invalid={errores.rol_parte ? true : undefined}
            aria-describedby={errores.rol_parte ? "error-rol-parte" : undefined}
          >
            <option value="">Elegí un rol</option>
            {Object.entries(ROLES_PARTE).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          {errores.rol_parte && (
            <p className="campo-error" id="error-rol-parte">
              {errores.rol_parte}
            </p>
          )}
        </div>

        <button type="submit">Agregar parte</button>
      </form>
    </div>
  );
}
