/**
 * Las 4 pestañas de la app. `nombre` coincide con el archivo de src/app/ (expo-router usa el
 * nombre del archivo como ruta). Tanto la barra nativa como la web leen esta lista.
 */
export const RUTAS = [
  {
    nombre: 'index',
    href: '/',
    titulo: 'Inicio',
    icono: require('@/assets/images/tabIcons/home.png'),
  },
  {
    nombre: 'buscar',
    href: '/buscar',
    titulo: 'Buscar',
    icono: require('@/assets/images/tabIcons/explore.png'),
  },
  {
    nombre: 'por-firmar',
    href: '/por-firmar',
    titulo: 'Por firmar',
    icono: require('@/assets/images/tabIcons/explore.png'),
  },
  {
    nombre: 'perfil',
    href: '/perfil',
    titulo: 'Perfil',
    icono: require('@/assets/images/tabIcons/home.png'),
  },
] as const;
