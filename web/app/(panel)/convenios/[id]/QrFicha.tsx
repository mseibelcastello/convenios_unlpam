"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { leerError } from "@/lib/errores";

type Props = {
  convenioId: number;
  codigo: string;
  // null si todavía no se generó
  token: string | null;
  // Gestión y administración lo generan (y solo con conexión)
  puedeGenerar: boolean;
  alGenerar: () => void;
};

// QR de la ficha: lleva solo un enlace con un token aleatorio, no datos del convenio.
// Quien lo escanea igual necesita sesión y permiso para ver el convenio.
export default function QrFicha({ convenioId, codigo, token, puedeGenerar, alGenerar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  if (!token && !puedeGenerar) return null;

  async function generar() {
    setGenerando(true);
    setError("");
    try {
      await api.post(`/agreements/${convenioId}/qr`);
      alGenerar();
    } catch (err) {
      setError(leerError(err).mensaje);
    } finally {
      setGenerando(false);
    }
  }

  // Descarga el QR como imagen PNG, con el código del convenio en el nombre del archivo
  function descargar() {
    const lienzo = contenedor.current?.querySelector("canvas");
    if (!lienzo) return;
    const enlace = document.createElement("a");
    enlace.href = lienzo.toDataURL("image/png");
    enlace.download = `QR-${codigo}.png`;
    enlace.click();
  }

  return (
    <section className="ficha-seccion qr-ficha">
      <h2>Código QR</h2>

      {token ? (
        <>
          <div className="qr-imagen" ref={contenedor}>
            <QRCodeCanvas
              value={`${window.location.origin}/qr/${token}`}
              size={480}
              marginSize={2}
              level="M"
              title={`Código QR del convenio ${codigo}`}
              role="img"
              aria-label={`Código QR del convenio ${codigo}`}
            />
          </div>
          <p className="qr-nota">
            Lleva a esta ficha. Solo lo abre quien inició sesión y tiene permiso sobre el convenio.
          </p>
          <button type="button" className="boton-secundario" onClick={descargar}>
            Descargar QR
          </button>
        </>
      ) : (
        <>
          <p className="qr-nota">Generá un QR para imprimirlo o compartirlo. Lleva solo una referencia, no el contenido.</p>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="boton-secundario" onClick={generar} disabled={generando}>
            {generando ? "Generando…" : "Generar QR"}
          </button>
        </>
      )}
    </section>
  );
}
