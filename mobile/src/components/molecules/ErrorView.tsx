import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Estado "error": algo falló. El botón Reintentar vuelve a pedir los datos.
type ErrorViewProps = {
  mensaje?: string;
  onReintentar: () => void;
};

export function ErrorView({
  mensaje = 'Ocurrió un error al cargar los datos.',
  onReintentar,
}: ErrorViewProps) {
  const theme = useTheme();

  return (
    <View style={styles.contenedor}>
      <View
        accessibilityRole="alert"
        style={[styles.caja, { backgroundColor: theme.errorBackground, borderColor: theme.error }]}>
        <ThemedText type="smallBold" themeColor="error">
          Error
        </ThemedText>
        <ThemedText type="small" themeColor="error">
          {mensaje}
        </ThemedText>
      </View>
      <Button titulo="Reintentar" onPress={onReintentar} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  caja: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
});
