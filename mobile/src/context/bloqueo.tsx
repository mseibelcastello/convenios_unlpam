import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { leerToken } from '@/api/sesion';
import { PantallaBloqueo } from '@/components/organisms/PantallaBloqueo';

// Si la app estuvo en segundo plano este tiempo o más, al volver se pide desbloquearla.
// Para la demo está en 1 minuto.
export const SEGUNDOS_PARA_BLOQUEAR = 60;

const Contexto = createContext<{ bloquearAhora: () => void } | null>(null);

export function BloqueoProvider({ children }: { children: ReactNode }) {
  const [bloqueada, setBloqueada] = useState(false);
  const desde = useRef<number | null>(null); // cuándo se fue a segundo plano

  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', async (estado) => {
      if (estado === 'background') {
        desde.current = Date.now();
      } else if (estado === 'active' && desde.current !== null) {
        const pasado = (Date.now() - desde.current) / 1000;
        desde.current = null;
        // Solo se bloquea si hay una sesión iniciada
        if (pasado >= SEGUNDOS_PARA_BLOQUEAR && (await leerToken())) setBloqueada(true);
      }
    });
    return () => suscripcion.remove();
  }, []);

  return (
    <Contexto.Provider value={{ bloquearAhora: () => setBloqueada(true) }}>
      {children}
      <PantallaBloqueo visible={bloqueada} onDesbloquear={() => setBloqueada(false)} />
    </Contexto.Provider>
  );
}

export function useBloqueo() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useBloqueo se usa dentro de BloqueoProvider');
  return valor;
}
