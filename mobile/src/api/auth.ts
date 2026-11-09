import axios from 'axios';

import { cliente } from '@/api/cliente';
import { borrarToken, guardarToken, guardarTokenLimitado } from '@/api/sesion';

export type Usuario = {
  id: number;
  name?: string;
  email?: string;
  rol?: string;
};

// Convierte un error de axios en un mensaje en español para mostrar en pantalla. 
function mensajeDeError(error: unknown, mensaje401: string): string {
  if (!axios.isAxiosError(error)) return 'Ocurrió un error inesperado';
  if (!error.response) return 'No se pudo conectar con el servidor';

  const { status, data } = error.response;
  if (status === 401) return mensaje401;
  if (status === 422) {
    const errores = data?.errors as Record<string, string[]> | undefined;
    return (errores && Object.values(errores)[0]?.[0]) ?? data?.message ?? 'Datos inválidos';
  }
  if (status === 423 || status === 429) {
    return data?.message ?? 'Demasiados intentos. Volvé a iniciar sesión';
  }
  return 'Error del servidor. Probá de nuevo más tarde';
}

/** Paso 1: correo y clave. El servidor responde con un token limitado y mfa_required. */
export async function login(correo: string, clave: string) {
  try {
    await borrarToken();
    const { data } = await cliente.post<{ token: string; mfa_required: boolean }>(
      '/auth/login',
      { correo, clave },
    );
    if (data.mfa_required) {
      guardarTokenLimitado(data.token);
    } else {
      await guardarToken(data.token);
    }
    return data;
  } catch (error) {
    throw new Error(mensajeDeError(error, 'Correo o clave incorrectos'));
  }
}

/** Paso 2: el código de 6 dígitos. Devuelve el token completo y lo guarda en SecureStore. */
export async function verificarMfa(codigo: string) {
  try {
    const { data } = await cliente.post<{ token: string; user: Usuario }>(
      '/auth/mfa/verify',
      { codigo },
    );
    await guardarToken(data.token);
    return data.user;
  } catch (error) {
    throw new Error(mensajeDeError(error, 'Código incorrecto o vencido'));
  }
}

export async function cerrarSesion() {
  await borrarToken();
}

/**
 * Al abrir la app: pregunta al servidor quién sos (GET /auth/me).
 * - Si el token ya no sirve (401), lo borra y devuelve false → hay que ir al login.
 * - Si falla por otra causa (sin red, servidor caído), no te saca de la sesión.
 */
export async function sesionVigente(): Promise<boolean> {
  try {
    await cliente.get('/auth/me');
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await borrarToken();
      return false;
    }
    return true;
  }
}
