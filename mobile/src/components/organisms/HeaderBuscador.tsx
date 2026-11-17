import { router } from 'expo-router';
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
  const { miniatura } = usePreferencias();

  return (
    <View style={styles.header}>
      <View style={styles.buscador}>
        <SearchBar onBuscar={(texto) => router.navigate({ pathname: '/buscar', params: { q: texto } })} />
      </View>

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
  sinFoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
