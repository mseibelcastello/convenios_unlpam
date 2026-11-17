import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SearchBar } from '@/components/molecules/SearchBar';
import { Spacing } from '@/constants/theme';

// Campo de búsqueda para el header de las pantallas principales.
// Al buscar, lleva a la pantalla Buscar con el texto ya puesto.
export function HeaderBuscador() {
  return (
    <View style={styles.header}>
      <SearchBar onBuscar={(texto) => router.navigate({ pathname: '/buscar', params: { q: texto } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: Spacing.three, paddingBottom: 0 },
});
