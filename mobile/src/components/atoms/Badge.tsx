import { StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Estados, type EstadoConvenio, Radius, Spacing } from '@/constants/theme';


//es una etiqueta que muestra los estados del convenio 

type BadgeProps = {
  estado: EstadoConvenio;
};

export function Badge({ estado }: BadgeProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { label, icon, dashed, ...modos } = Estados[estado];            //separa los estados de los modos, modo es solo ligth y dark
  const colores = modos[scheme];                                        //elige los colores que correspondan segun el modo actual

  return (
    <View
      accessibilityLabel={`Estado: ${label}`}
      style={[
        styles.badge,
        {
          backgroundColor: colores.background,
          borderColor: colores.text,
          borderStyle: dashed ? 'dashed' : 'solid',
        },
      ]}>
      <ThemedText type="smallBold" style={{ color: colores.text }}>
        {icon} {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
});