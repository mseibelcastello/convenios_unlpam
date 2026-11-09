import axios from 'axios';
import { router } from 'expo-router';

import { API_URL } from '@/api/config';
import { borrarToken, tokenParaApi } from '@/api/sesion';

export const cliente = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  // Sin este encabezado Laravel puede responder con una redirección en vez de un JSON de error.
  headers: { Accept: 'application/json' },
});

// Agrega el token a cada pedido.
cliente.interceptors.request.use(async (config) => {
  const token = await tokenParaApi();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// En estas rutas un 401 significa "datos incorrectos", no "sesión vencida".
const RUTAS_DE_ACCESO = ['/auth/login', '/auth/mfa/verify'];

// Si el servidor dice 401 (token vencido o revocado): borra el token y vuelve al login.
cliente.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const url: string = error.config?.url ?? '';
    const esAcceso = RUTAS_DE_ACCESO.some((ruta) => url.includes(ruta));
    if (axios.isAxiosError(error) && error.response?.status === 401 && !esAcceso) {
      await borrarToken();
      router.replace('/login');
    }
    return Promise.reject(error);
  },
);
