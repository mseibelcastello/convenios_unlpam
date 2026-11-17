import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet } from 'react-native';

import { Tarjeta } from '@/components/atoms/Tarjeta';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Tarjeta con título que se abre y se cierra al tocarla (con animación).
// Así cada pantalla muestra solo los títulos y el detalle aparece cuando se pide.
type PlegableProps = { titulo: string; abierta?: boolean; children: ReactNode };

export function Plegable({ titulo, abierta = false, children }: PlegableProps) {
  const theme = useTheme();
  const [visible, setVisible] = useState(abierta);

  function alternar() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVisible(!visible);
  }

  return (
    <Tarjeta acento="#e86a04" style={styles.caja}>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityState={{ expanded: visible }}
        style={styles.titulo}
      >
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.texto}>
          {titulo}
        </ThemedText>
        <Ionicons name={visible ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSecondary} />
      </Pressable>
      {visible && children}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  titulo: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  texto: { flex: 1 },
});
