import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Fila de opciones para elegir una. Tocar la opción elegida la saca (valor vacío).
type OpcionesProps = {
  titulo: string;
  opciones: { valor: string; texto: string }[];
  valor: string;
  onElegir: (valor: string) => void;
};

export function Opciones({ titulo, opciones, valor, onElegir }: OpcionesProps) {
  const theme = useTheme();

  return (
    <View style={styles.grupo}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      <View style={styles.opciones}>
        {opciones.map((o) => {
          const elegida = valor === o.valor;
          return (
            <Pressable
              key={o.valor}
              onPress={() => onElegir(elegida ? '' : o.valor)}
              accessibilityRole="button"
              accessibilityState={{ selected: elegida }}
              style={[
                styles.opcion,
                {
                  backgroundColor: elegida ? theme.primary : theme.backgroundElement,
                  borderColor: elegida ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type="small" style={{ color: elegida ? theme.onPrimary : theme.text }}>
                {o.texto}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: Spacing.two },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  opcion: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.large,
  },
});
