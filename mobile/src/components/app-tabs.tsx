import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { RUTAS } from '@/navigation/rutas';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={scheme === 'dark' ? '#2A181B' : '#FFF8F5'}
      tintColor={colors.primary}
      indicatorColor={colors.backgroundSelected}
      labelStyle={{ selected: { color: colors.primary } }}>
      {RUTAS.map((ruta) => (
        <NativeTabs.Trigger key={ruta.nombre} name={ruta.nombre}>
          <NativeTabs.Trigger.Label>{ruta.titulo}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={ruta.sf} md={ruta.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}