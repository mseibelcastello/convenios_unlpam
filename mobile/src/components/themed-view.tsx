import { View, type ViewProps } from 'react-native';

import { Fondo } from '@/components/atoms/Fondo';
import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  conFondo?: boolean; // pantalla completa: dibuja el fondo con grilla y destellos de la app
};

export function ThemedView({ style, lightColor, darkColor, type, conFondo, children, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps}>
      {conFondo && <Fondo />}
      {children}
    </View>
  );
}
