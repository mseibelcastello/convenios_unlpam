import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { cliente } from '@/api/cliente';

// La huella como forma de verificación del login (junto con el código del mail, del SMS o de Authenticator).
// El servidor no puede comprobar una huella, así que se ata a este celular: después de verificar con un código
// se genera un secreto, se guarda acá (SecureStore) y su hash se registra en la API (POST /me/biometric).
// Para verificar con la huella, el celular la pide y manda ese secreto (POST /auth/mfa/verify { huella }).

const CLAVE = 'mfa-huella';
const nativo = Platform.OS !== 'web';

type Guardado = { usuarioId: number; secreto: string };

// ¿El celular tiene lector de huella y alguna huella registrada?
export async function huellaDisponible() {
  if (!nativo) return false;
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

async function leerGuardado(): Promise<Guardado | null> {
  const texto = await SecureStore.getItemAsync(CLAVE);
  return texto ? JSON.parse(texto) : null;
}

// ¿Esta persona ya activó la huella en este celular?
export async function huellaActivada(usuarioId: number) {
  return (await leerGuardado())?.usuarioId === usuarioId;
}

// Pide la huella. Devuelve true si es correcta.
async function pedirHuella(mensaje: string) {
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: mensaje,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: true, // solo huella, sin el PIN del celular
  });
  return resultado.success;
}

// Activa la huella en este celular. Hay que tener la sesión completa (se llama después de verificar un código).
// Devuelve false si la persona canceló.
export async function activarHuella(usuarioId: number) {
  if (!(await pedirHuella('Confirmá tu huella para usarla al iniciar sesión'))) return false;

  const secreto = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, '');
  await cliente.post('/me/biometric', { secreto });
  await SecureStore.setItemAsync(CLAVE, JSON.stringify({ usuarioId, secreto }));
  return true;
}

// Pide la huella y, si es correcta, devuelve el secreto guardado para mandarlo al servidor. Si no, null.
export async function secretoConHuella() {
  if (!(await pedirHuella('Verificá tu identidad para entrar'))) return null;
  return (await leerGuardado())?.secreto ?? null;
}

// Hay un secreto guardado en este celular (de cualquier persona)
export async function hayHuellaGuardada() {
  return nativo && (await leerGuardado()) !== null;
}
