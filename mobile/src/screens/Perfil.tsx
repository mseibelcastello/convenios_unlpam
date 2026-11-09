import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cerrarSesion } from '@/api/auth';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function Perfil() {
  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <ThemedText type="subtitle">Perfil</ThemedText>
          <Button titulo="Cerrar sesión" variante="secundario" onPress={salir} />
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
