/**
 * Dirección de la API. En el emulador de Android la computadora se ve como 10.0.2.2
 * (no localhost). En un celular real hay que poner la IP de tu computadora en la misma red,
 * por ejemplo EXPO_PUBLIC_API_URL=http://192.168.1.20:8000/api
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api';