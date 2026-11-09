import axios from 'axios';

import { API_URL } from '@/api/config';
import { tokenParaApi } from '@/api/sesion';

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