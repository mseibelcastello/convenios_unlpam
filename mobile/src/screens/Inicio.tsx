import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConvenioCard } from '@/components/organisms/ConvenioCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function Inicio() {
  return (
    <ThemedView style={styles.contenedor}>
      {/* SafeAreaView evita que el contenido quede tapado por las barras */}
      <SafeAreaView style={styles.area}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <ThemedText type="subtitle">Inicio</ThemedText>
          <ConvenioCard
            titulo="Convenio marco de pasantías"
            codigo="CONV-001"
            unidad="Facultad de Ingeniería"
            estado="revision"
            onVer={() => {}}
          />
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