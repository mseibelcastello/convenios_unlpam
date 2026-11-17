import type { ImageSourcePropType } from 'react-native';

// Textos de ayuda de la app. Se editan acá, sin tocar las pantallas.

export type SeccionAyuda = 'inicio' | 'buscar' | 'porFirmar' | 'perfil';

// Ayuda corta de cada pantalla principal (el ícono "?")
export const AYUDA_SECCIONES: Record<SeccionAyuda, { titulo: string; texto: string }> = {
  inicio: {
    titulo: 'Inicio',
    texto:
      'Acá ves un resumen de los convenios: firmados, vigentes, en trámite y pendientes. Debajo están los últimos movimientos; tocá uno para abrir el convenio. También podés elegir tu sede para ver sus convenios.',
  },
  buscar: {
    titulo: 'Buscar',
    texto:
      'Escribí un texto y tocá Buscar, o usá Filtros para elegir año, tipo, estado y unidad. Tocá un convenio para desplegar sus convenios vinculados y documentos. Con "Escanear código QR" abrís un convenio desde su QR.',
  },
  porFirmar: {
    titulo: 'Por firmar',
    texto:
      'Son los convenios aprobados que esperan la firma de administración. Tocá uno para abrir su ficha y su documento. Sin conexión se ven los últimos que se guardaron, pero no se puede firmar.',
  },
  perfil: {
    titulo: 'Perfil',
    texto:
      'Elegí el tamaño de letra, el modo claro u oscuro y tu foto de perfil. Desde acá también registrás tu identidad, creás el PIN de bloqueo y cerrás la sesión.',
  },
};

// Para agregar una captura a un paso: guardá la imagen en assets/ayuda/ y poné
// imagen: require('../../assets/ayuda/nombre.png') en ese paso.
export type PasoManual = { texto: string; imagen?: ImageSourcePropType };

export const MANUAL: { titulo: string; pasos: PasoManual[] }[] = [
  {
    titulo: 'Cómo registrar mi identidad',
    pasos: [
      { texto: 'Abrí la pestaña Perfil y tocá "Registrar mi identidad".' },
      { texto: 'Firma: tocá "Dibujar firma", firmá con el dedo en el recuadro y tocá "Guardar firma".' },
      { texto: 'Rostro: tocá "Sacar foto", aceptá el permiso de la cámara, mirá de frente y tocá "Tomar foto".' },
      { texto: 'Huella: tocá "Verificar huella" y apoyá el dedo en el sensor del celular.' },
      { texto: 'Cuando los tres pasos tengan la marca verde "Registrada", tu identidad está completa.' },
    ],
  },
  {
    titulo: 'Cómo firmar un documento',
    pasos: [
      { texto: 'Solo administración puede firmar, y solo convenios en estado Aprobado.' },
      { texto: 'Entrá a la pestaña "Por firmar" y tocá el convenio. Se abre su ficha.' },
      { texto: 'En la sección Documentos, tocá el documento para abrir el PDF.' },
      { texto: 'Leé el documento hasta el final: ahí aparece el botón "Firmar". Con dos dedos podés hacer zoom.' },
      { texto: 'Tocá "Firmar" y confirmá con tu huella.' },
      { texto: 'Dibujá tu firma a mano y tocá "Guardar firma". Aceptá el permiso de ubicación.' },
      { texto: 'Listo: se muestra la fecha, la hora y el lugar de la firma. Tocá "Ver ficha" para ver el convenio firmado.' },
    ],
  },
];
