import { useEffect } from 'react';
import { AppState } from 'react-native';

import { traerYGuardarPorFirmar } from '@/api/porFirmarLocal';
import { actualizarRecordatorioFirma, reprogramarNovedades } from '@/api/recordatorios';
import AppTabs from '@/components/app-tabs';
import { usePreferencias } from '@/context/preferencias';

export default function TabsLayout() {
  const { cargarDelServidor } = usePreferencias();

  // Se entra a las pestañas con la sesión iniciada (al abrir la app o después del login):
  // se traen las preferencias y la foto de la persona
  useEffect(() => {
    cargarDelServidor();
  }, []);

  // Recordatorios: al abrir la app (y cada vez que vuelve al primer plano) se reprograma "Hay novedades"
  // y se revisa si hay convenios por firmar
  useEffect(() => {
    function alAbrir() {
      reprogramarNovedades().catch((e) => console.warn('[recordatorios] novedades:', e));
      traerYGuardarPorFirmar().catch(() => {}); // copia en el teléfono para el modo sin conexión (solo administración la recibe)
      actualizarRecordatorioFirma().catch((e) => console.warn('[recordatorios] firma:', e));
    }
    alAbrir();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') alAbrir();
    });
    return () => suscripcion.remove();
  }, []);

  return <AppTabs />;
}
