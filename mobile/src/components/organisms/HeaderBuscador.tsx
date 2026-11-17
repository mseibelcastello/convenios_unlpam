import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AvisoSinConexion } from '@/components/molecules/AvisoSinConexion';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePreferencias } from '@/context/preferencias';
import { useSinConexion } from '@/hooks/use-sin-conexion';
import { useTheme } from '@/hooks/use-theme';

// Header de las pantallas principales: el campo de búsqueda y la foto de perfil en miniatura.
// Al buscar, lleva a la pantalla Buscar con el texto ya puesto. Al tocar la foto, abre Mi Perfil.
export function HeaderBuscador() {
  const theme = useTheme();
  const { miniatura, nombre, noLeidas, actualizarNoLeidas } = usePreferencias();
  const sinConexion = useSinConexion();

  // Cada vez que se vuelve a una pantalla con este header, el número de la campana se actualiza
  useFocusEffect(
    useCallback(() => {
      actualizarNoLeidas();
    }, []),
  );

  return (
    <>
      {/* Sin red: el banner avisa y el buscador no hace nada */}
      {sinConexion && (
        <View style={styles.banner}>
          <AvisoSinConexion completo />
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.marca}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {nombre || 'Mi cuenta'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Gestión de convenios
          </ThemedText>
        </View>

        {/* Sin red la búsqueda no hace nada: el ícono se oculta */}
        {!sinConexion && (
          <Pressable
            onPress={() => router.navigate('/buscar')}
            accessibilityRole="button"
            accessibilityLabel="Buscar convenios"
            style={styles.icono}
          >
            <Ionicons name="search-outline" size={26} color={theme.text} />
          </Pressable>
        )}

        <Pressable
          onPress={() => router.push('/alertas')}
          accessibilityRole="button"
          accessibilityLabel={`Alertas, ${noLeidas} sin leer`}
          style={styles.icono}
        >
          <Ionicons name="notifications-outline" size={28} color={theme.text} />
          {noLeidas > 0 && (
            <View style={styles.contador}>
              <ThemedText type="small" style={styles.numero}>
                {noLeidas > 99 ? '99+' : noLeidas}
              </ThemedText>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.navigate('/perfil')}
          accessibilityRole="button"
          accessibilityLabel="Ir a Mi perfil"
        >
          {miniatura ? (
            <Image source={{ uri: miniatura }} accessibilityLabel="Foto de perfil" style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.sinFoto, { borderColor: theme.border }]}>
              <Ionicons name="person-outline" size={22} color={theme.textSecondary} />
            </View>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    paddingVertical: Spacing.one,
    paddingBottom: 0,
  },
  banner: { padding: Spacing.three, paddingBottom: 0 },
  marca: { flex: 1 },
  icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  foto: { width: 36, height: 36, borderRadius: 18 },
  contador: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#b3141a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: { color: '#fff', fontSize: 11, lineHeight: 14 },
  sinFoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
