import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { usePreferencias } from '@/context/preferencias';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { escala } = usePreferencias(); // tamaño de letra elegido en Mi Perfil
  const base = StyleSheet.flatten(styles[type]) as TextStyle;
  const tamano = { fontSize: (base.fontSize ?? 16) * escala, lineHeight: (base.lineHeight ?? 24) * escala };

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], tamano, style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontFamily: 'OpenSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: 'OpenSans_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: 'OpenSans_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 48,
    lineHeight: 52,
  },
  subtitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 28,
    lineHeight: 38,
  },
  link: {
    fontFamily: 'OpenSans_600SemiBold',
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: 'OpenSans_600SemiBold',
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
