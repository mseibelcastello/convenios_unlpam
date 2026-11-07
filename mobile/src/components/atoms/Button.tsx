import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario';
};

export function Button({ titulo, onPress, variante = 'primario' }: ButtonProps) {
  const theme = useTheme();
  const primario = variante === 'primario';

  return (
    
    <Pressable   //componente que indica que se toca
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      style={({ pressed }) => [                 //si esta presionado, le baja la opacidad
        styles.boton,
        {
          backgroundColor: primario ? theme.primary : theme.backgroundElement,
          borderColor: primario ? theme.primary : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
        //los colores los toma de los temas configurados en otro archivo
      <ThemedText type="smallBold" themeColor={primario ? 'onPrimary' : 'text'}>
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
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
});