import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Estado "cargando": se muestra mientras se espera la respuesta de la API.
type LoadingViewProps = {
  mensaje?: string;
};

export function LoadingView({ mensaje = 'Cargando…' }: LoadingViewProps) {
  const theme = useTheme();

  return (
    <View style={styles.contenedor} accessibilityRole="progressbar" accessibilityLabel={mensaje}>
      <ActivityIndicator size="large" color={theme.primary} />
      <ThemedText type="small" themeColor="textSecondary">
        {mensaje}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
});
