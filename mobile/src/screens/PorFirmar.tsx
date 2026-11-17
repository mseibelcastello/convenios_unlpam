import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBuscador } from '@/components/organisms/HeaderBuscador';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function PorFirmar() {
  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <HeaderBuscador />
        <ScrollView contentContainerStyle={styles.contenido}>
          <ThemedText type="subtitle">Por firmar</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  contenido: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
});