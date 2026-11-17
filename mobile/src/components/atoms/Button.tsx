import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
};

// Primario: degradé rojo a naranja, como los botones de la web. Secundario: vidrio con borde.
export function Button({ titulo, onPress, variante = 'primario' }: ButtonProps) {
  const theme = useTheme();
  const primario = variante === 'primario';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      // Al presionar baja la opacidad
      style={({ pressed }) => [
        styles.boton,
        primario
          ? { borderColor: 'transparent', shadowColor: '#e86a04', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }
          : { backgroundColor: theme.vidrio, borderColor: theme.border },
        { opacity: pressed ? 0.75 : 1 },
      ]}>
      {primario && (
        <LinearGradient
          colors={['#b3141a', '#c2410c']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <ThemedText type="smallBold" style={{ color: primario ? '#ffffff' : theme.text }}>
        {titulo}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.large - 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
