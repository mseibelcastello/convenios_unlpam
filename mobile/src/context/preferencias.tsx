import * as SecureStore from 'expo-secure-store';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { Appearance, Platform } from 'react-native';

import { API_URL } from '@/api/config';
import { cliente } from '@/api/cliente';
import { EscalaLetra, type TamanoLetra } from '@/constants/theme';

// Las preferencias de la persona (Mi Perfil): modo claro/oscuro, tamaño de letra y foto.
// Se guardan en la API (/me/preferences) y también en el celular, para que al abrir la app
// ya estén aplicadas sin esperar la respuesta del servidor.

export type Modo = 'claro' | 'oscuro';

type Preferencias = {
  modo: Modo;
  tamano: TamanoLetra;
  escala: number; // lo que se multiplica a todos los tamaños de texto
  miniatura: string | null; // dirección de la foto en miniatura
  nombre: string; // nombre de la persona con la sesión iniciada
  noLeidas: number; // alertas sin leer (número de la campana)
  actualizarNoLeidas: () => Promise<void>;
  cargarDelServidor: () => Promise<void>;
  guardar: (modo: Modo, tamano: TamanoLetra) => Promise<void>;
  subirFoto: (foto: { uri: string; fileName?: string | null; mimeType?: string | null }) => Promise<void>;
};

const Contexto = createContext<Preferencias | null>(null);

const CLAVE = 'preferencias';
const nativo = Platform.OS !== 'web';

// La API devuelve la foto con la dirección del servidor (localhost); el celular la ve por la IP de la API
function direccionDeLaApp(url: string | null) {
  if (!url) return null;
  return API_URL.replace(/\/api$/, '') + url.replace(/^https?:\/\/[^/]+/, '');
}

async function guardarEnElCelular(modo: Modo, tamano: TamanoLetra) {
  if (nativo) await SecureStore.setItemAsync(CLAVE, JSON.stringify({ modo, tamano }));
}

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [modo, setModo] = useState<Modo>('claro');
  const [tamano, setTamano] = useState<TamanoLetra>('mediana');
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [noLeidas, setNoLeidas] = useState(0);

  // Al abrir la app: lo último que se guardó en el celular
  useEffect(() => {
    async function leer() {
      try {
        const guardado = nativo ? await SecureStore.getItemAsync(CLAVE) : null;
        if (guardado) {
          const datos = JSON.parse(guardado);
          setModo(datos.modo);
          setTamano(datos.tamano);
        }
      } catch {}
    }
    leer();
  }, []);

  // Aplica el modo a toda la app: todos los useColorScheme() pasan a devolver este valor
  useEffect(() => {
    try {
      Appearance.setColorScheme(modo === 'oscuro' ? 'dark' : 'light');
    } catch {} // en la versión web no existe
  }, [modo]);

  // Con la sesión iniciada: trae las preferencias y la foto de la API (GET /auth/me)
  async function cargarDelServidor() {
    try {
      const { data } = await cliente.get('/auth/me');
      setModo(data.user.modo);
      setTamano(data.user.tamano_letra);
      setMiniatura(direccionDeLaApp(data.user.miniatura_url));
      setNombre(data.user.name ?? '');
      await guardarEnElCelular(data.user.modo, data.user.tamano_letra);
    } catch {}
  }

  // Pide solo la cantidad de alertas sin leer (meta.no_leidas de GET /alerts)
  async function actualizarNoLeidas() {
    try {
      const { data } = await cliente.get('/alerts', { params: { no_leidas: 1 } });
      setNoLeidas(data.meta.no_leidas);
    } catch {}
  }

  // Cambia en el momento (se ve en toda la app) y después lo guarda en la API
  async function guardar(nuevoModo: Modo, nuevoTamano: TamanoLetra) {
    setModo(nuevoModo);
    setTamano(nuevoTamano);
    await guardarEnElCelular(nuevoModo, nuevoTamano);
    await cliente.put('/me/preferences', { tamano_letra: nuevoTamano, modo: nuevoModo });
  }

  async function subirFoto(foto: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    const formulario = new FormData();
    // En React Native un archivo se manda como { uri, name, type }
    formulario.append('foto', {
      uri: foto.uri,
      name: foto.fileName ?? 'foto.jpg',
      type: foto.mimeType ?? 'image/jpeg',
    } as unknown as Blob);

    const { data } = await cliente.post('/me/photo', formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    setMiniatura(direccionDeLaApp(data.miniatura_url));
  }

  return (
    <Contexto.Provider
      value={{ modo, tamano, escala: EscalaLetra[tamano], miniatura, nombre, noLeidas, actualizarNoLeidas, cargarDelServidor, guardar, subirFoto }}>
      {children}
    </Contexto.Provider>
  );
}

export function usePreferencias() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('usePreferencias se usa dentro de PreferenciasProvider');
  return valor;
}
