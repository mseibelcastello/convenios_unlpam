import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CLAVE = 'token';
const nativo = Platform.OS !== 'web';

// El token limitado solo sirve para verificar el código: vive únicamente en memoria.
let limitado: string | null = null;

// En web no existe SecureStore, así que ahí el token completo queda en memoria.
let enMemoria: string | null = null;

export function guardarTokenLimitado(token: string) {
    limitado = token;
}

//Guarda el token completo, cifrado en el celular, y descarta el limitado. */
export async function guardarToken(token: string) {
    limitado = null;
    enMemoria = token;
    if (nativo) await SecureStore.setItemAsync(CLAVE, token);
}

// Token completo (sesión iniciada). El limitado no cuenta como sesión. */
export async function leerToken(): Promise<string | null> {
    if (enMemoria) return enMemoria;
    return nativo ? SecureStore.getItemAsync(CLAVE) : null;
}

// El que se manda a la API: el limitado si estamos verificando el código, si no el completo. */
export async function tokenParaApi(): Promise<string | null> {
    return limitado ?? (await leerToken());
}

export async function borrarToken() {
    limitado = null;
    enMemoria = null;
    if (nativo) await SecureStore.deleteItemAsync(CLAVE);
}
