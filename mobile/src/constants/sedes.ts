// Sedes de la UNLPam con coordenadas reales (de OpenStreetMap y de las direcciones publicadas por la universidad).
// La sigla es la de la unidad en la API (GET /unidades).
export const SEDES = [
  { sigla: 'FCEyN', nombre: 'Facultad de Exactas y Naturales (Av. Uruguay 151, Santa Rosa)', lat: -36.6257, lng: -64.2933 },
  { sigla: 'FCEyJ', nombre: 'Facultad de Económicas y Jurídicas (Coronel Gil 353, Santa Rosa)', lat: -36.6204, lng: -64.2894 },
  { sigla: 'FCH', nombre: 'Facultad de Ciencias Humanas (9 de Julio 149, Santa Rosa)', lat: -36.6202, lng: -64.2932 },
  { sigla: 'FCS', nombre: 'Facultad de Ciencias de la Salud (Brasil 794, Santa Rosa)', lat: -36.6266, lng: -64.2952 },
  { sigla: 'FA', nombre: 'Facultad de Agronomía (Santa Rosa)', lat: -36.5572, lng: -64.3017 },
  { sigla: 'FI', nombre: 'Facultad de Ingeniería (General Pico)', lat: -35.6678, lng: -63.7704 },
  { sigla: 'FCV', nombre: 'Facultad de Ciencias Veterinarias (Calle 5 y 116, General Pico)', lat: -35.6706, lng: -63.7776 },
] as const;

// Hasta qué distancia se considera "cerca" de una sede
export const RADIO_KM = 1;
