"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { encolarCambio, esSinConexion, useConCopiaLocal } from "@/lib/local";
import FormularioConvenio from "../../FormularioConvenio";

export default function EditarConvenio() {
  const { id } = useParams();
  const router = useRouter();
  // Sin conexión se edita sobre la copia guardada de la ficha
  const lectura = useConCopiaLocal<Record<string, unknown>>(`/agreements/${id}`, Number(id), "datos");
  const convenio = lectura.datos;

  // Al guardar se manda la versión que se cargó; si alguien más lo editó, la API responde 409
  async function guardar(datos: Record<string, string>) {
    const version = Number(convenio?.version);
    try {
      await api.put(`/agreements/${id}`, { ...datos, version });
    } catch (err) {
      if (!esSinConexion(err)) throw err;
      // Sin red: queda en la cola con la versión que tenía, para mandarlo a POST /sync cuando vuelva
      await encolarCambio({ tipo: "edicion", convenio_id: Number(id), version, datos });
    }
    router.push(`/convenios/${id}`);
  }

  if (lectura.sinConexion && !convenio) {
    return <p role="status">Sin conexión, y este convenio no está guardado en este navegador.</p>;
  }
  if (!convenio) return <p>Cargando…</p>;

  return (
    <>
      <h1>Editar {String(convenio.codigo)}</h1>
      {lectura.sinConexion && (
        <p className="aviso-pendientes" role="status">
          Sin conexión: el cambio va a quedar guardado en este navegador y se envía cuando vuelva la red.
        </p>
      )}
      <FormularioConvenio inicial={convenio} enviar={guardar} />
    </>
  );
}
