import * as SecureStore from "expo-secure-store";

import { RADIO_KM, SEDES } from "@/constants/sedes";

// Sede o unidad de la persona. Solo se guarda cuál eligió (o cuál se reconoció), nunca las coordenadas.

export type SedeElegida = {
  unidadId: number;
  sigla: string;
  nombre: string;
  porUbicacion: boolean;
};

const CLAVE = "sede-elegida";

// Distancia en km entre dos puntos (fórmula de haversine)
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const aRad = (g: number) => (g * Math.PI) / 180;
  const dLat = aRad(lat2 - lat1);
  const dLng = aRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

// La sede más cercana, si la posición está a menos de RADIO_KM de alguna. Si no, null.
export function sedeCercana(lat: number, lng: number) {
  let mejor: { sede: (typeof SEDES)[number]; km: number } | null = null;
  for (const sede of SEDES) {
    const km = distanciaKm(lat, lng, sede.lat, sede.lng);
    if (km <= RADIO_KM && (!mejor || km < mejor.km)) mejor = { sede, km };
  }
  return mejor?.sede ?? null;
}

export async function leerSede(): Promise<SedeElegida | null> {
  try {
    const texto = await SecureStore.getItemAsync(CLAVE);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

export async function guardarSede(sede: SedeElegida) {
  try {
    await SecureStore.setItemAsync(CLAVE, JSON.stringify(sede));
  } catch {}
}

export async function borrarSede() {
  try {
    await SecureStore.deleteItemAsync(CLAVE);
  } catch {}
}
