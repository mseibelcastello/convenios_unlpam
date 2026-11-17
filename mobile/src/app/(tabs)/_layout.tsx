import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { usePreferencias } from '@/context/preferencias';

export default function TabsLayout() {
  const { cargarDelServidor } = usePreferencias();

  // Se entra a las pestañas con la sesión iniciada (al abrir la app o después del login):
  // se traen las preferencias y la foto de la persona
  useEffect(() => {
    cargarDelServidor();
  }, []);

  return <AppTabs />;
}
