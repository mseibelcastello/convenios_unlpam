"use client";

import { useAuth } from "@/lib/auth";

export default function Inicio() {
  const { usuario } = useAuth();
  return (
    <>
      <h1>Hola, {usuario?.name}</h1>
      <p>
        Entraste como {usuario?.rol}
        {usuario?.unidad ? ` de ${usuario.unidad.nombre}` : ""}.
      </p>
    </>
  );
}
