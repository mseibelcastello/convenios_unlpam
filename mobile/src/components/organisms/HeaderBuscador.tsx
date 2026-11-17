import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { SearchBar } from '@/components/molecules/SearchBar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePreferencias } from '@/context/preferencias';
import { useTheme } from '@/hooks/use-theme';

// Header de las pantallas principales: el campo de búsqueda y la foto de perfil en miniatura.
// Al buscar, lleva a la pantalla Buscar con el texto ya puesto. Al tocar la foto, abre Mi Perfil.
export function HeaderBuscador() {
  const theme = useTheme();
  const { miniatura, noLeidas, actualizarNoLeidas } = usePreferencias();

  // Cada vez que se vuelve a una pantalla con este header, el número de la campana se actualiza
  useFocusEffect(
    useCallback(() => {
      actualizarNoLeidas();
    }, []),
  );

  return (
    <View style={styles.header}>
      <View style={styles.buscador}>
        <SearchBar onBuscar={(texto) => router.navigate({ pathname: '/buscar', params: { q: texto } })} />
      </View>

      <Pressable onPress={() => router.push('/alertas')} accessibilityRole="button" accessibilityLabel={`Alertas, ${noLeidas} sin leer`}>
        <ThemedText type="subtitle">🔔</ThemedText>
        {noLeidas > 0 && (
          <View style={styles.contador}>
            <ThemedText type="small" style={styles.numero}>
              {noLeidas > 99 ? '99+' : noLeidas}
            </ThemedText>
          </View>
        )}
      </Pressable>

      <Pressable onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Ir a Mi perfil">
        {miniatura ? (
          <Image source={{ uri: miniatura }} style={styles.foto} />
        ) : (
          <View style={[styles.foto, styles.sinFoto, { borderColor: theme.border }]}>
            <ThemedText>👤</ThemedText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, paddingBottom: 0 },
  buscador: { flex: 1 },
  foto: { width: 44, height: 44, borderRadius: 22 },
  contador: { position: 'absolute', top: -2, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: '#d33', alignItems: 'center', justifyContent: 'center' },
  numero: { color: '#fff', fontSize: 11, lineHeight: 14 },
  sinFoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
