/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Tokens de diseño (tarea 2.6). Cinco colores base: tinta (bordó casi negro), crema rosada
 * (fondo), rojo UNLPam, naranja UNLPam y verde. Estados, error, éxito y aviso son tonos de
 * esas cinco familias. Contraste WCAG 2.1 AA (4,5:1 en texto) verificado en claro y oscuro.
 * Mismos valores que web/src/styles/tokens.css y docs/design/tokens-y-componentes.html.
 * Las claves text, background, backgroundElement, backgroundSelected y textSecondary
 * se mantienen porque las usan ThemedText y ThemedView.
 */
export const Colors = {
  light: {
    text: '#2E1519',
    background: '#FAEDE8',
    backgroundElement: '#FFF8F5',
    backgroundSelected: '#F1DDD6',
    textSecondary: '#6B4A4E',
    border: '#8E6E70',
    header: '#2E1519',
    onHeader: '#FBEDE8',
    primary: '#C8181C',
    onPrimary: '#FFFFFF',
    accent: '#E86A04',
    error: '#A4001B',
    errorBackground: '#FBDADA',
    success: '#1E6B3A',
    successBackground: '#DDEFE2',
    warning: '#8A4300',
    warningBackground: '#FCE3CB',
  },
  dark: {
    text: '#FBEDE8',
    background: '#1B0F11',
    backgroundElement: '#2A181B',
    backgroundSelected: '#3A2226',
    textSecondary: '#CDB4B0',
    border: '#9A7F80',
    header: '#2A181B',
    onHeader: '#FBEDE8',
    primary: '#E86A04',
    onPrimary: '#1F0E08',
    accent: '#FF8A3D',
    error: '#FF8A8F',
    errorBackground: '#4A1B20',
    success: '#6FD08C',
    successBackground: '#12331F',
    warning: '#FFB866',
    warningBackground: '#43290C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Un color por estado de convenio. La insignia siempre muestra también el texto (label) y un
 * símbolo (icon), y el borrador además lleva borde punteado: el color nunca es lo único que
 * distingue el estado.
 */
export type EstadoConvenio =
  | 'borrador'
  | 'revision'
  | 'aprobado'
  | 'firmado'
  | 'rescindido'
  | 'archivado';

export const Estados: Record<
  EstadoConvenio,
  {
    label: string;
    icon: string;
    dashed: boolean;
    light: { text: string; background: string };
    dark: { text: string; background: string };
  }
> = {
  borrador: {
    label: 'Borrador',
    icon: '✎',
    light: { text: '#6B4A4E', background: '#FFF8F5' },
    dark: { text: '#CDB4B0', background: '#2A181B' },
    dashed: true,
  },
  revision: {
    label: 'En revisión',
    icon: '◐',
    light: { text: '#8A4300', background: '#FCE3CB' },
    dark: { text: '#FFB866', background: '#43290C' },
    dashed: false,
  },
  aprobado: {
    label: 'Aprobado',
    icon: '✓',
    light: { text: '#1E6B3A', background: '#DDEFE2' },
    dark: { text: '#6FD08C', background: '#12331F' },
    dashed: false,
  },
  firmado: {
    label: 'Firmado',
    icon: '✍',
    light: { text: '#FFFFFF', background: '#1E6B3A' },
    dark: { text: '#0F2A18', background: '#6FD08C' },
    dashed: false,
  },
  rescindido: {
    label: 'Rescindido',
    icon: '✕',
    light: { text: '#A4001B', background: '#FBDADA' },
    dark: { text: '#FF8A8F', background: '#4A1B20' },
    dashed: false,
  },
  archivado: {
    label: 'Archivado',
    icon: '▣',
    light: { text: '#FBEDE8', background: '#2E1519' },
    dark: { text: '#1B0F11', background: '#FBEDE8' },
    dashed: false,
  },
};

/**
 * Tipografía: Montserrat para títulos y Open Sans para texto (las del sitio de la UNLPam),
 * con la fuente del sistema como respaldo hasta cargarlas con expo-font.
 */
export const Tipografia = {
  titulo: 'Montserrat',
  cuerpo: 'Open Sans',
} as const;

/**
 * Tamaño de letra elegido por la persona en Mi Perfil (letra chica, mediana o grande).
 * Se multiplica por el tamaño base de cada estilo de texto.
 */
export type TamanoLetra = 'chica' | 'mediana' | 'grande';

export const EscalaLetra: Record<TamanoLetra, number> = {
  chica: 0.875,
  mediana: 1,
  grande: 1.25,
};

export const Radius = { small: 3, medium: 6, large: 12 } as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
