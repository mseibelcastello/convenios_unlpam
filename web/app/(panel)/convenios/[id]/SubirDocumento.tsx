"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { leerError } from "@/lib/errores";
import { TIPOS_DOCUMENTO } from "@/lib/tipos";

type Props = {
  convenioId: number;
  // Se llama cuando el documento se subió, para que la lista se vuelva a cargar
  alGuardar: () => void;
};

export default function SubirDocumento({ convenioId, alGuardar }: Props) {
  const { usuario } = useAuth();
  const [tipo, setTipo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState("");

  // Revisión solo puede subir dictámenes (la API también lo controla)
  const tipos = Object.entries(TIPOS_DOCUMENTO).filter(([valor]) => usuario?.rol !== "revision" || valor === "dictamen");

  async function subir(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    setErrores({});
    setMensaje("");

    // La API también lo controla; acá se avisa antes de mandar
    if (archivo && (archivo.type !== "application/pdf" || archivo.size > 20 * 1024 * 1024)) {
      setErrores({ archivo: "Tiene que ser un PDF de hasta 20 MB." });
      return;
    }

    const datos = new FormData();
    datos.append("tipo", tipo);
    if (archivo) datos.append("archivo", archivo);

    try {
      await api.post(`/agreements/${convenioId}/documents`, datos);
      formulario.reset();
      setTipo("");
      setArchivo(null);
      alGuardar();
    } catch (err) {
      const { mensaje, campos } = leerError(err);
      setErrores(campos);
      // Si el error ya sale bajo un campo, no se repite arriba
      setMensaje(campos.archivo || campos.tipo ? "" : mensaje);
    }
  }

  return (
    <div className="agregar">
      <h3>Subir documento</h3>

      <form className="formulario" onSubmit={subir}>
        {mensaje && (
          <p className="login-error" role="alert">
            {mensaje}
          </p>
        )}

        <div className="campo">
          <label htmlFor="documento-tipo">Tipo de documento *</label>
          <select
            id="documento-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            required
            aria-invalid={errores.tipo ? true : undefined}
            aria-describedby={errores.tipo ? "error-documento-tipo" : undefined}
          >
            <option value="">Elegí un tipo</option>
            {tipos.map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          {errores.tipo && (
            <p className="campo-error" id="error-documento-tipo">
              {errores.tipo}
            </p>
          )}
        </div>

        <div className="campo">
          <label htmlFor="documento-archivo">PDF (hasta 20 MB) *</label>
          <input
            id="documento-archivo"
            type="file"
            accept=".pdf,application/pdf"
            required
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            aria-invalid={errores.archivo ? true : undefined}
            aria-describedby={errores.archivo ? "error-documento-archivo" : undefined}
          />
          {errores.archivo && (
            <p className="campo-error" id="error-documento-archivo">
              {errores.archivo}
            </p>
          )}
        </div>

        <button type="submit">Subir documento</button>
      </form>
    </div>
  );
}
