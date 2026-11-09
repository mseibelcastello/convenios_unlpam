import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { EmptyView } from '@/components/molecules/EmptyView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Estado = 'cargando' | 'vacio' | 'error';

// Pantalla temporal para ver las tres vistas de estado. Se borra al usarlas en pantallas reales.
export default function PruebaEstados() {
  const [estado, setEstado] = useState<Estado>('cargando');

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <ThemedText type="subtitle" style={styles.titulo}>
          Pantallas de estado
        </ThemedText>

        <View style={styles.botones}>
          <Button titulo="Cargando" variante="secundario" onPress={() => setEstado('cargando')} />
          <Button titulo="Vacío" variante="secundario" onPress={() => setEstado('vacio')} />
          <Button titulo="Error" variante="secundario" onPress={() => setEstado('error')} />
        </View>

        {estado === 'cargando' && <LoadingView />}
        {estado === 'vacio' && <EmptyView />}
        {estado === 'error' && (
          <ErrorView
            mensaje="No se pudo conectar con el servidor"
            onReintentar={() => setEstado('cargando')}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  titulo: { padding: Spacing.three },
  botones: { gap: Spacing.two, paddingHorizontal: Spacing.three },
});
