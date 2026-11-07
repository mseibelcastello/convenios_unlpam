/**
 * Cliente de la API REST (Laravel). Por ahora solo define la URL base; las funciones por
 * recurso (convenios, auth, firmas) se agregan siguiendo el contrato de docs/api.md.
 * La URL se configura con EXPO_PUBLIC_API_URL (por ejemplo http://10.0.2.2:8000/api en el
 * emulador de Android).
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';
