"use client";

import { useState } from "react";
import { useConCopiaLocal } from "@/lib/local";
import { useAuth } from "@/lib/auth";
import { descargarArchivo } from "@/lib/descargas";
import { TIPOS_DOCUMENTO } from "@/lib/tipos";
import SubirDocumento from "./SubirDocumento";

type Documento = {
  id: number;
  tipo: string;
  version: number;
  nombre_original: string;
  tamano_bytes: number;
  subido_en: string;
  subido_por_nombre: string | null;
};

function tamano(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fecha(texto: string) {
  return new Date(texto).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export default function Documentos({ convenioId }: { convenioId: number }) {
  const { usuario } = useAuth();
  const [recarga, setRecarga] = useState(0);
  // La lista se guarda en IndexedDB para verla sin conexión (el PDF en sí no se guarda)
  const lectura = useConCopiaLocal<{ data: Documento[] }>(`/agreements/${convenioId}/documents`, convenioId, "documentos", recarga);
  const documentos = lectura.datos?.data ?? [];
  const [error, setError] = useState("");

  // Consulta solo mira la lista; los demás roles pueden subir
  const puedeSubir = usuario?.rol !== "consulta";


  async function descargar(d: Documento) {
    setError("");
    try {
      await descargarArchivo(`/documents/${d.id}/download`, d.nombre_original);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el documento.");
    }
  }

  return (
    <section className="ficha-seccion">
      <h2>Documentos</h2>

      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}

      {documentos.length === 0 && <p className="vacio">Todavía no hay documentos.</p>}
      {documentos.length > 0 && (
        <ul className="documentos-lista">
          {documentos.map((d) => (
            <li key={d.id}>
              <span className="documento-datos">
                <strong title={d.nombre_original}>{d.nombre_original}</strong>
                <small>
                  {TIPOS_DOCUMENTO[d.tipo]} · versión {d.version} · {tamano(d.tamano_bytes)} · {fecha(d.subido_en)}
                  {d.subido_por_nombre && ` · ${d.subido_por_nombre}`}
                </small>
              </span>
              <button type="button" className="boton-secundario" onClick={() => descargar(d)} aria-label={`Descargar ${d.nombre_original}`}>
                Descargar
              </button>
            </li>
          ))}
        </ul>
      )}

      {puedeSubir && !lectura.sinConexion && <SubirDocumento convenioId={convenioId} alGuardar={() => setRecarga(recarga + 1)} />}
    </section>
  );
}
