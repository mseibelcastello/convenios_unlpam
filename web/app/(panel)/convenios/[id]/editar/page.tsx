"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  type CambioPendiente,
  edicionPendienteDe,
  encolarCambio,
  esSinConexion,
  sincronizar,
  useConCopiaLocal,
} from "@/lib/local";
import FormularioConvenio from "../../FormularioConvenio";

export default function EditarConvenio() {
  const { id } = useParams();
  const router = useRouter();
  // Sin conexión se edita sobre la copia guardada de la ficha
  const lectura = useConCopiaLocal<Record<string, unknown>>(`/agreements/${id}`, Number(id), "datos");
  const convenio = lectura.datos;
  // Una edición hecha antes sin conexión y todavía sin mandar (undefined = buscándola)
  const [pendiente, setPendiente] = useState<CambioPendiente | null | undefined>(undefined);
  // true después de guardar sin red: el cambio quedó en la cola
  const [enCola, setEnCola] = useState(false);

  useEffect(() => {
    edicionPendienteDe(Number(id)).then((c) => setPendiente(c ?? null));
  }, [id]);

  // Al guardar se manda la versión que se cargó; si alguien más lo editó, la API responde 409
  async function guardar(datos: Record<string, string>) {
    const convenioId = Number(id);

    if (pendiente) {
      // Ya había una edición sin mandar: esta la reemplaza en la cola, sobre la misma versión del servidor.
      // Si hay conexión se manda ya; si no, cuando vuelva.
      await encolarCambio({ tipo: "edicion", convenio_id: convenioId, version: pendiente.version, datos });
      try {
        await sincronizar();
        router.push(`/convenios/${id}`);
      } catch {
        setEnCola(true);
      }
      return;
    }

    const version = Number(convenio?.version);
    try {
      await api.put(`/agreements/${id}`, { ...datos, version });
      router.push(`/convenios/${id}`);
    } catch (err) {
      if (!esSinConexion(err)) throw err;
      // Sin red: queda en la cola con la versión que tenía, para mandarlo a POST /sync cuando vuelva.
      // No se navega: sin red la navegación queda esperando, así que se confirma acá mismo.
      await encolarCambio({ tipo: "edicion", convenio_id: convenioId, version, datos });
      setEnCola(true);
    }
  }

  if (enCola) {
    return (
      <div className="vacio-grande" role="status">
        <strong>Guardado sin conexión</strong>
        <span>El cambio quedó en este navegador y se envía solo cuando vuelva la red.</span>
        <Link href={`/convenios/${id}`} className="boton-secundario">
          Volver a la ficha
        </Link>
      </div>
    );
  }

  if (lectura.sinConexion && !convenio) {
    return <p role="status">Sin conexión, y este convenio no está guardado en este navegador.</p>;
  }
  if (!convenio || pendiente === undefined) return <p>Cargando…</p>;

  return (
    <>
      <h1>Editar {String(convenio.codigo)}</h1>
      {lectura.sinConexion && (
        <p className="aviso-pendientes" role="status">
          Sin conexión: el cambio va a quedar guardado en este navegador y se envía cuando vuelva la red.
        </p>
      )}
      {pendiente && (
        <p className="aviso-pendientes" role="status">
          Este formulario incluye cambios que hiciste sin conexión y todavía no se enviaron.
        </p>
      )}
      <FormularioConvenio inicial={{ ...convenio, ...pendiente?.datos }} enviar={guardar} />
    </>
  );
}
