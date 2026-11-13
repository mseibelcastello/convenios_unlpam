"use client";

import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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

  // La descarga necesita el token, así que no sirve un enlace común:
  // se pide el archivo con axios y se lo entrega al navegador.
  async function descargar(d: Documento) {
    setError("");
    try {
      const r = await api.get(`/documents/${d.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = d.nombre_original;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Con responseType "blob", el mensaje del error también llega como blob
      let texto = "No se pudo descargar el documento.";
      if (isAxiosError(err) && err.response?.data instanceof Blob) {
        try {
          texto = JSON.parse(await err.response.data.text()).message ?? texto;
        } catch {}
      }
      setError(texto);
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
