"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { esSinConexion } from "@/lib/local";

// Lo que abre el QR de una ficha: con el token se pide el convenio y, si hay permiso, se va a su ficha.
// Sin permiso la API responde 404, lo mismo que con un token que no existe.
export default function AbrirQr() {
  const { token } = useParams();
  const router = useRouter();
  const [problema, setProblema] = useState<"sin-acceso" | "sin-conexion" | null>(null);

  useEffect(() => {
    api
      .get(`/qr/${token}`)
      .then((r) => router.replace(`/convenios/${r.data.id}`))
      .catch((err) => setProblema(esSinConexion(err) ? "sin-conexion" : "sin-acceso"));
  }, [token, router]);

  if (problema === "sin-acceso") {
    return (
      <div className="vacio-grande" role="status">
        <strong>No podés abrir este convenio</strong>
        <span>El código QR no corresponde a un convenio al que tengas acceso.</span>
      </div>
    );
  }

  if (problema === "sin-conexion") {
    return (
      <div className="vacio-grande" role="status">
        <strong>Sin conexión</strong>
        <span>Para abrir un convenio desde su QR hace falta conexión.</span>
      </div>
    );
  }

  return <p role="status">Abriendo el convenio…</p>;
}
