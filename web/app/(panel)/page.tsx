"use client";

import { useAuth } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export default function Inicio() {
  const { usuario } = useAuth();
  return (
    <>
      <h1>Hola, {usuario?.name}</h1>
      <p>
        Entraste como {usuario && ROLES[usuario.rol]}
        {usuario?.unidad ? ` de ${usuario.unidad.nombre}` : ""}.
      </p>
    </>
  );
}
