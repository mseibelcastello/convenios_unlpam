/**
 * Las 4 pestañas de la app. `nombre` coincide con el archivo de src/app/ (expo-router usa el
 * nombre del archivo como ruta). Tanto la barra nativa como la web leen esta lista.
 */
export const RUTAS = [
  {
    nombre: 'index',
    href: '/',
    titulo: 'Inicio',
    sf: 'house.fill',
    md: 'home',
  },
  {
    nombre: 'buscar',
    href: '/buscar',
    titulo: 'Buscar',
    sf: 'magnifyingglass',
    md: 'search',
  },
  {
    nombre: 'por-firmar',
    href: '/por-firmar',
    titulo: 'Por firmar',
    sf: 'signature',
    md: 'draw',
  },
  {
    nombre: 'perfil',
    href: '/perfil',
    titulo: 'Perfil',
    sf: 'person.fill',
    md: 'person',
  },
] as const;
