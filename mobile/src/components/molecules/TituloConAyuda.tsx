import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { AYUDA_SECCIONES, type SeccionAyuda } from '@/constants/ayuda';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Título de una pantalla principal con un ícono "?" al lado. Al tocarlo abre la ayuda de esa sección.
export function TituloConAyuda({ titulo, seccion }: { titulo: string; seccion: SeccionAyuda }) {
  const theme = useTheme();
  const [abierta, setAbierta] = useState(false);
  const ayuda = AYUDA_SECCIONES[seccion];

  return (
    <View style={styles.fila}>
      <ThemedText type="subtitle">{titulo}</ThemedText>
      <Pressable
        onPress={() => setAbierta(true)}
        accessibilityRole="button"
        accessibilityLabel={`Ayuda sobre ${ayuda.titulo}`}
        style={[styles.icono, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">?</ThemedText>
      </Pressable>

      <Modal visible={abierta} transparent animationType="fade" onRequestClose={() => setAbierta(false)}>
        <View style={styles.fondo}>
          <View style={[styles.dialogo, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText type="subtitle">{ayuda.titulo}</ThemedText>
            <ThemedText>{ayuda.texto}</ThemedText>
            <Button
              titulo="Ver el manual completo"
              variante="secundario"
              onPress={() => {
                setAbierta(false);
                router.push('/ayuda');
              }}
            />
            <Button titulo="Cerrar" onPress={() => setAbierta(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  icono: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fondo: { flex: 1, justifyContent: 'center', padding: Spacing.three, backgroundColor: 'rgba(0,0,0,0.5)' },
  dialogo: { gap: Spacing.three, padding: Spacing.four, borderWidth: 1, borderRadius: Radius.large },
});
