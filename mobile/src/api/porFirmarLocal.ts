import * as SQLite from 'expo-sqlite';

import { cliente } from '@/api/cliente';

// Copia de los convenios "por firmar" guardada en el teléfono (SQLite),
// para poder verlos cuando no hay conexión.

export type PorFirmar = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  unidad: { id: number; sigla: string; nombre: string } | null;
  fecha_vencimiento: string | null;
};

let base: Promise<SQLite.SQLiteDatabase> | null = null;

// Abre la base una sola vez y crea la tabla si no existe
function abrir() {
  base ??= SQLite.openDatabaseAsync('convenios.db').then(async (db) => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS por_firmar (id INTEGER PRIMARY KEY, datos TEXT NOT NULL)');
    return db;
  });
  return base;
}

// Reemplaza lo guardado por la lista nueva
export async function guardarPorFirmar(lista: PorFirmar[]) {
  const db = await abrir();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM por_firmar');
    for (const c of lista) {
      await db.runAsync('INSERT INTO por_firmar (id, datos) VALUES (?, ?)', [c.id, JSON.stringify(c)]);
    }
  });
}

export async function leerPorFirmar(): Promise<PorFirmar[]> {
  const db = await abrir();
  const filas = await db.getAllAsync<{ datos: string }>('SELECT datos FROM por_firmar');
  return filas.map((f) => JSON.parse(f.datos));
}

// Al cerrar sesión: no queda nada de la persona en el teléfono
export async function borrarPorFirmar() {
  const db = await abrir();
  await db.runAsync('DELETE FROM por_firmar');
}

// Pide los convenios por firmar a la API (GET /agreements/to-sign) y los guarda en el teléfono.
// Devuelve la lista para mostrarla. Si la API responde con error, tira la excepción.
export async function traerYGuardarPorFirmar() {
  const { data } = await cliente.get<{ data: PorFirmar[] }>('/agreements/to-sign');
  await guardarPorFirmar(data.data);
  return data.data;
}
