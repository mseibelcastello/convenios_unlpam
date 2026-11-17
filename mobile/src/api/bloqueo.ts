import axios from 'axios';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { cliente } from '@/api/cliente';

// Bloqueo de la app: PIN de 4 dígitos. Solo se guarda un hash (con sal), nunca el PIN.

const CLAVE_PIN = 'pin-hash';
const CLAVE_INTENTOS = 'pin-intentos';
const MAX_INTENTOS = 5;

// SHA-256 de "sal:pin"
async function hashear(sal: string, pin: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${pin}`);
}

export async function pinConfigurado() {
  return (await SecureStore.getItemAsync(CLAVE_PIN)) !== null;
}

export async function guardarPin(pin: string) {
  const sal = Crypto.randomUUID();
  await SecureStore.setItemAsync(CLAVE_PIN, `${sal}:${await hashear(sal, pin)}`);
  await SecureStore.deleteItemAsync(CLAVE_INTENTOS);
}

export async function borrarPin() {
  await SecureStore.deleteItemAsync(CLAVE_PIN);
  await SecureStore.deleteItemAsync(CLAVE_INTENTOS);
}

// Después de desbloquear por cualquier camino, los intentos fallidos vuelven a cero
export async function reiniciarIntentos() {
  await SecureStore.deleteItemAsync(CLAVE_INTENTOS);
}

// 'ok': PIN correcto. 'mal': incorrecto. 'agotado': ya falló 5 veces, hay que usar la huella o la contraseña.
export async function verificarPin(pin: string): Promise<'ok' | 'mal' | 'agotado'> {
  const intentos = Number((await SecureStore.getItemAsync(CLAVE_INTENTOS)) ?? 0);
  if (intentos >= MAX_INTENTOS) return 'agotado';

  const guardado = await SecureStore.getItemAsync(CLAVE_PIN);
  if (!guardado) return 'mal';

  const [sal, hash] = guardado.split(':');
  if ((await hashear(sal, pin)) === hash) {
    await reiniciarIntentos();
    return 'ok';
  }

  await SecureStore.setItemAsync(CLAVE_INTENTOS, String(intentos + 1));
  return intentos + 1 >= MAX_INTENTOS ? 'agotado' : 'mal';
}

// Contraseña de la cuenta como alternativa si se olvidó el PIN.
// Se comprueba con POST /auth/login (el mismo del inicio de sesión); la respuesta no se usa ni se guarda.
// Devuelve null si es correcta, o el mensaje de error para mostrar.
export async function verificarClave(clave: string): Promise<string | null> {
  try {
    const { data } = await cliente.get<{ user: { email: string } }>('/auth/me');
    await cliente.post('/auth/login', {
      email: data.user.email,
      password: clave,
    });
    await reiniciarIntentos();
    return null;
  } catch (e) {
    if (!axios.isAxiosError(e) || !e.response)
      return 'No se pudo conectar con el servidor. La contraseña necesita conexión.';
    if (e.response.status === 401) return 'Contraseña incorrecta.';
    if (e.response.status === 429) return 'Demasiados intentos. Esperá un momento.';
    return 'No se pudo verificar la contraseña. Probá de nuevo.';
  }
}
