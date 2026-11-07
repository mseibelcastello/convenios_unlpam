import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { RUTAS } from '@/navigation/rutas';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ selected: { color: colors.text } }}>
      {RUTAS.map((ruta) => (
        <NativeTabs.Trigger key={ruta.nombre} name={ruta.nombre}>
          <NativeTabs.Trigger.Label>{ruta.titulo}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={ruta.icono} renderingMode="template" />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}