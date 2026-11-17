"use client";

import { isAxiosError } from "axios";
import Dexie, { type EntityTable } from "dexie";
import { useEffect, useState } from "react";
import { api } from "./api";

// Persistencia local (IndexedDB) para ver convenios sin conexión y guardar cambios hechos sin red.
// Se borra entera al cerrar sesión: en una compu compartida no queda nada del usuario anterior.

// Cada parte de la ficha se pide por separado, así que se guarda por separado
type Seccion = "datos" | "vinculos" | "documentos" | "observaciones";

export type ConvenioGuardado = {
  id: number;
  guardado_en: string;
} & Partial<Record<Seccion, unknown>>;

// Mismo formato que espera POST /sync, para mandarla tal cual cuando vuelva la red
export type CambioPendiente = {
  id?: number;
  id_cliente: string;
  tipo: "edicion" | "comentario";
  convenio_id: number;
  version: number | null; // la versión que tenía el cliente al editar
  datos?: Record<string, unknown>;
  contenido?: string;
  creado_en: string;
};

const db = new Dexie("convenios_unlpam") as Dexie & {
  convenios: EntityTable<ConvenioGuardado, "id">;
  cambios: EntityTable<CambioPendiente, "id">;
};

db.version(1).stores({
  convenios: "id, guardado_en",
  cambios: "++id, convenio_id, creado_en",
});

// Sin respuesta del servidor = sin conexión (o API caída). Un 403/404/422 no cuenta.
export function esSinConexion(err: unknown) {
  return isAxiosError(err) && !err.response;
}

// IndexedDB puede no estar disponible (modo privado, permisos): la página sigue andando igual
async function seguro<T>(accion: () => Promise<T>): Promise<T | undefined> {
  try {
    return await accion();
  } catch {
    return undefined;
  }
}

async function guardarSeccion(id: number, seccion: Seccion, valor: unknown) {
  await seguro(() =>
    db.transaction("rw", db.convenios, async () => {
      const anterior = await db.convenios.get(id);
      await db.convenios.put({ ...anterior, id, [seccion]: valor, guardado_en: new Date().toISOString() });
    }),
  );
}

export async function leerConvenioGuardado(id: number) {
  return seguro(() => db.convenios.get(id));
}

export async function encolarCambio(cambio: Omit<CambioPendiente, "id" | "id_cliente" | "creado_en">) {
  await db.cambios.add({ ...cambio, id_cliente: crypto.randomUUID(), creado_en: new Date().toISOString() });
}

export async function cambiosPendientesDe(convenioId: number) {
  return (await seguro(() => db.cambios.where("convenio_id").equals(convenioId).toArray())) ?? [];
}

export async function borrarDatosLocales() {
  await seguro(() => Promise.all([db.convenios.clear(), db.cambios.clear()]));
}

type Lectura<T> = {
  datos: T | null;
  // true si se muestra la copia guardada porque no hubo conexión
  sinConexion: boolean;
  guardadoEn: string | null;
  // Error de la API que no es por falta de conexión (por ejemplo, 404)
  error: number | null;
};

/**
 * Pide una parte de la ficha. Si llega, la guarda en IndexedDB; si no hay conexión, devuelve lo guardado.
 * "recarga" sirve para volver a pedirla (cambia cuando se agrega algo).
 */
export function useConCopiaLocal<T>(
  url: string,
  convenioId: number,
  seccion: Seccion,
  recarga: number | string = 0,
): Lectura<T> {
  const [lectura, setLectura] = useState<Lectura<T>>({ datos: null, sinConexion: false, guardadoEn: null, error: null });

  useEffect(() => {
    let vigente = true;

    api
      .get(url)
      .then((r) => {
        if (!vigente) return;
        setLectura({ datos: r.data, sinConexion: false, guardadoEn: null, error: null });
        guardarSeccion(convenioId, seccion, r.data);
      })
      .catch(async (err) => {
        if (!esSinConexion(err)) {
          if (vigente) setLectura({ datos: null, sinConexion: false, guardadoEn: null, error: err.response?.status ?? 500 });
          return;
        }
        const copia = await leerConvenioGuardado(convenioId);
        if (!vigente) return;
        setLectura({
          datos: (copia?.[seccion] as T | undefined) ?? null,
          sinConexion: true,
          guardadoEn: copia?.guardado_en ?? null,
          error: null,
        });
      });

    return () => {
      vigente = false;
    };
  }, [url, convenioId, seccion, recarga]);

  return lectura;
}
