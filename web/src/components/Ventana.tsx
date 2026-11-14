"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icono } from "@/components/Iconos";

type Props = {
  abierta: boolean;
  titulo: string;
  alCerrar: () => void;
  children: React.ReactNode;
};

// Ventana modal sobre el <dialog> nativo: el navegador atrapa el foco, cierra con Esc y deja inerte el resto de la página.
// Tocar el fondo la cierra, salvo que ya se haya escrito algo (para no perder lo cargado por error).
export default function Ventana({ abierta, titulo, alCerrar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const [conCambios, setConCambios] = useState(false);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  return (
    <dialog
      ref={ref}
      className="ventana"
      aria-labelledby={idTitulo}
      onClose={() => {
        setConCambios(false);
        alCerrar();
      }}
      // El fondo es el propio <dialog>: un click cuyo destino es el <dialog> cayó fuera de la tarjeta
      onClick={(e) => {
        if (e.target === e.currentTarget && !conCambios) alCerrar();
      }}
    >
      <div className="ventana-caja" onInput={() => setConCambios(true)}>
        <header className="ventana-cabecera">
          <h2 id={idTitulo}>{titulo}</h2>
          <button type="button" className="icono-boton" aria-label="Cerrar" onClick={alCerrar}>
            <Icono nombre="cerrar" />
          </button>
        </header>
        <div className="ventana-cuerpo">{abierta && children}</div>
      </div>
    </dialog>
  );
}
