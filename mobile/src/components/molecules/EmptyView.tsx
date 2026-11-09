import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Estado "vacío": la consulta salió bien pero no hay resultados.
type EmptyViewProps = {
  titulo?: string;
  mensaje?: string;
};

export function EmptyView({
  titulo = 'No hay nada para mostrar',
  mensaje = 'Todavía no hay resultados en esta sección.',
}: EmptyViewProps) {
  return (
    <View style={styles.contenedor}>
      <ThemedText type="subtitle" style={styles.centrado}>
        {titulo}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.centrado}>
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
    gap: Spacing.two,
    padding: Spacing.four,
  },
  centrado: { textAlign: 'center' },
});
