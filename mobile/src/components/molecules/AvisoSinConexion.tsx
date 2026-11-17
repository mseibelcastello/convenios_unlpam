import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// El aviso de modo sin conexión: es el mismo en el banner de arriba y en cada función bloqueada
export const MENSAJE_SIN_CONEXION = 'Estás sin conexión. Esta función no está disponible hasta que vuelvas a conectarte.';

export function AvisoSinConexion({ completo = false }: { completo?: boolean }) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[styles.caja, { backgroundColor: theme.errorBackground, borderColor: theme.error }]}>
      <ThemedText type="smallBold" themeColor="error">
        Estás sin conexión
      </ThemedText>
      {completo && (
        <ThemedText type="small" themeColor="error">
          Esta función no está disponible hasta que vuelvas a conectarte.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.one, padding: Spacing.two, borderWidth: 1, borderRadius: Radius.medium },
});
