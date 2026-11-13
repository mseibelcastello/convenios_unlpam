"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [recarga, setRecarga] = useState(0);
  const [error, setError] = useState("");

  // Consulta solo mira la lista; los demás roles pueden subir
  const puedeSubir = usuario?.rol !== "consulta";

  useEffect(() => {
    api.get(`/agreements/${convenioId}/documents`).then((r) => setDocumentos(r.data.data));
  }, [convenioId, recarga]);

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

      {documentos.length === 0 && <p>Sin documentos</p>}
      {documentos.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Versión</th>
              <th>Archivo</th>
              <th>Tamaño</th>
              <th>Subido</th>
              <th>Por</th>
              <th>Descargar</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={d.id}>
                <td>{TIPOS_DOCUMENTO[d.tipo]}</td>
                <td>{d.version}</td>
                <td>{d.nombre_original}</td>
                <td>{tamano(d.tamano_bytes)}</td>
                <td>{fecha(d.subido_en)}</td>
                <td>{d.subido_por_nombre ?? "—"}</td>
                <td>
                  <button type="button" onClick={() => descargar(d)} aria-label={`Descargar ${d.nombre_original}`}>
                    Descargar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {puedeSubir && <SubirDocumento convenioId={convenioId} alGuardar={() => setRecarga(recarga + 1)} />}
    </section>
  );
}
