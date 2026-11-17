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
  // pendiente: falta mandarlo; conflicto: el servidor tenía otra versión; rechazado: el servidor no lo aceptó
  estado: "pendiente" | "conflicto" | "rechazado";
  motivo?: string;
  // En un conflicto, cómo está el convenio hoy en el servidor (para comparar y elegir)
  servidor?: Record<string, unknown>;
};

export type ResumenSync = { aplicados: number; conflictos: number; rechazados: number };

const db = new Dexie("convenios_unlpam") as Dexie & {
  convenios: EntityTable<ConvenioGuardado, "id">;
  cambios: EntityTable<CambioPendiente, "id">;
};

db.version(1).stores({
  convenios: "id, guardado_en",
  cambios: "++id, convenio_id, creado_en",
});

// v2: cada cambio de la cola tiene un estado (los que ya estaban quedan pendientes)
db.version(2)
  .stores({
    convenios: "id, guardado_en",
    cambios: "++id, convenio_id, estado, creado_en",
  })
  .upgrade((tx) =>
    tx
      .table("cambios")
      .toCollection()
      .modify((c) => {
        c.estado ??= "pendiente";
      }),
  );

// Avisa a la pantalla que la cola cambió (para actualizar contadores y avisos)
const EVENTO_COLA = "cola-cambios";
function avisarCola() {
  window.dispatchEvent(new Event(EVENTO_COLA));
}

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

/**
 * Agrega un cambio a la cola. Si ya hay una edición pendiente del mismo convenio, se reemplaza su contenido
 * y se conserva la versión original: las dos ediciones se hicieron sobre esa misma versión del servidor.
 */
export async function encolarCambio(cambio: Omit<CambioPendiente, "id" | "id_cliente" | "creado_en" | "estado">) {
  await db.transaction("rw", db.cambios, async () => {
    const previa =
      cambio.tipo === "edicion"
        ? await db.cambios
            .where("convenio_id")
            .equals(cambio.convenio_id)
            .filter((c) => c.tipo === "edicion" && c.estado === "pendiente")
            .first()
        : undefined;

    if (previa?.id) {
      await db.cambios.update(previa.id, { datos: cambio.datos, creado_en: new Date().toISOString() });
    } else {
      await db.cambios.add({ ...cambio, id_cliente: crypto.randomUUID(), creado_en: new Date().toISOString(), estado: "pendiente" });
    }
  });
  avisarCola();
}

/** La edición todavía sin mandar de un convenio (para abrir el formulario con lo que ya se cambió) */
export async function edicionPendienteDe(convenioId: number) {
  return seguro(() =>
    db.cambios
      .where("convenio_id")
      .equals(convenioId)
      .filter((c) => c.tipo === "edicion" && c.estado === "pendiente")
      .first(),
  );
}

export async function cambiosPendientesDe(convenioId: number) {
  return (await seguro(() => db.cambios.where("convenio_id").equals(convenioId).toArray())) ?? [];
}

export async function borrarDatosLocales() {
  await seguro(() => Promise.all([db.convenios.clear(), db.cambios.clear()]));
  avisarCola();
}

// ---- Sincronización con POST /sync ----

const MAX_POR_ENVIO = 50; // el mismo límite que tiene la API

let enCurso: Promise<ResumenSync> | null = null;

/**
 * Manda los cambios pendientes a POST /sync. Lo aplicado sale de la cola; los conflictos y rechazos
 * quedan guardados para que la persona decida. Si ya hay una sincronización andando, espera esa misma.
 * Si no hay conexión, la promesa falla y la cola queda como estaba.
 */
export function sincronizar(): Promise<ResumenSync> {
  enCurso ??= enviarCola().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

async function enviarCola(): Promise<ResumenSync> {
  const resumen: ResumenSync = { aplicados: 0, conflictos: 0, rechazados: 0 };
  const pendientes = (await seguro(() => db.cambios.where("estado").equals("pendiente").sortBy("id"))) ?? [];

  for (let i = 0; i < pendientes.length; i += MAX_POR_ENVIO) {
    const lote = pendientes.slice(i, i + MAX_POR_ENVIO);
    const r = await api.post("/sync", {
      cambios: lote.map(({ id_cliente, tipo, convenio_id, version, datos, contenido }) => ({
        id_cliente,
        tipo,
        convenio_id,
        version,
        datos,
        contenido,
      })),
    });

    for (const resultado of r.data.resultados) {
      const cambio = lote.find((c) => c.id_cliente === resultado.id_cliente);
      if (!cambio?.id) continue;

      if (resultado.estado === "aplicado") {
        await db.cambios.delete(cambio.id);
        resumen.aplicados++;
      } else if (resultado.estado === "conflicto") {
        await db.cambios.update(cambio.id, { estado: "conflicto", motivo: resultado.motivo, servidor: resultado.actual });
        resumen.conflictos++;
      } else {
        await db.cambios.update(cambio.id, { estado: "rechazado", motivo: resultado.motivo });
        resumen.rechazados++;
      }
    }
  }

  avisarCola();
  return resumen;
}

/** Conflicto: me quedo con mi versión. Se reenvía sobre la versión que tiene hoy el servidor. */
export async function quedarmeConLoMio(cambio: CambioPendiente) {
  if (!cambio.id) return;
  await db.cambios.update(cambio.id, {
    estado: "pendiente",
    version: Number(cambio.servidor?.version),
    motivo: undefined,
    servidor: undefined,
  });
  avisarCola();
  return sincronizar();
}

/** Conflicto o rechazo: me quedo con lo del servidor, mi cambio se descarta */
export async function descartarCambio(cambio: CambioPendiente) {
  if (!cambio.id) return;
  await db.cambios.delete(cambio.id);
  avisarCola();
}

/** La cola completa, actualizada cada vez que cambia */
export function useCola() {
  const [cola, setCola] = useState<CambioPendiente[]>([]);

  useEffect(() => {
    const leer = () => seguro(() => db.cambios.orderBy("id").toArray()).then((lista) => setCola(lista ?? []));
    leer();
    window.addEventListener(EVENTO_COLA, leer);
    return () => window.removeEventListener(EVENTO_COLA, leer);
  }, []);

  return {
    cola,
    pendientes: cola.filter((c) => c.estado === "pendiente"),
    // Los que necesitan una decisión de la persona
    porResolver: cola.filter((c) => c.estado !== "pendiente"),
  };
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
