"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import FormularioConvenio from "../../FormularioConvenio";

export default function EditarConvenio() {
  const { id } = useParams();
  const router = useRouter();
  const [convenio, setConvenio] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.get(`/agreements/${id}`).then((r) => setConvenio(r.data));
  }, [id]);

  // Al guardar se manda la versión que se cargó; si alguien más lo editó, la API responde 409
  async function guardar(datos: Record<string, string>) {
    await api.put(`/agreements/${id}`, { ...datos, version: convenio?.version });
    router.push(`/convenios/${id}`);
  }

  if (!convenio) return <p>Cargando…</p>;

  return (
    <>
      <h1>Editar {String(convenio.codigo)}</h1>
      <FormularioConvenio inicial={convenio} enviar={guardar} />
    </>
  );
}
