"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import FormularioConvenio from "../FormularioConvenio";

export default function NuevoConvenio() {
  const router = useRouter();

  async function crear(datos: Record<string, string>) {
    const r = await api.post("/agreements", datos);
    router.push(`/convenios/${r.data.id}`);
  }

  return (
    <>
      <h1>Nuevo convenio</h1>
      <FormularioConvenio enviar={crear} />
    </>
  );
  
}
