"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import FormularioConvenio from "../FormularioConvenio";

export default function NuevoConvenio() {
  const router = useRouter();

  async function crear(datos: Record<string, string>, archivo: File | null) {
    const r = await api.post("/agreements", datos);

    // Con el convenio creado, se le sube el PDF como documento principal
    if (archivo) {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      formulario.append("tipo", "principal");
      try {
        await api.post(`/agreements/${r.data.id}/documents`, formulario);
      } catch {
        throw new Error(
          `El convenio ${r.data.codigo} se creó, pero no se pudo subir el PDF. Buscalo en el listado de convenios.`
        );
      }
    }

    router.push(`/convenios/${r.data.id}`);
  }

  return (
    <>
      <h1>Nuevo convenio</h1>
      <FormularioConvenio enviar={crear} />
    </>
  );
}
