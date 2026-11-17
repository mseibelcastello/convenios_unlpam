import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Tarjeta de vidrio, como las de la web: blanca translúcida, borde claro, esquinas redondeadas
// y sombra cálida. Con `acento` lleva una franja de color a la izquierda (como las cajas de números).
type TarjetaProps = ViewProps & { acento?: string; children?: ReactNode };

export function Tarjeta({ acento, style, children, ...resto }: TarjetaProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      {...resto}
      style={[
        styles.tarjeta,
        { backgroundColor: theme.vidrio, borderColor: theme.vidrioBorde, shadowColor: theme.sombra },
        style,
      ]}
    >
      {acento && <View style={[styles.franja, { backgroundColor: acento }]} />}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: Radius.large,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 2,
  },
  franja: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});
