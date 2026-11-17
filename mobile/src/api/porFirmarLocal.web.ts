// TEMPORAL (solo para la vista previa en web): sin SQLite
import { cliente } from '@/api/cliente';
export type PorFirmar = { id: number; codigo: string; titulo: string; tipo: string; unidad: { id: number; sigla: string; nombre: string } | null; fecha_vencimiento: string | null };
export async function guardarPorFirmar(_l: PorFirmar[]) {}
export async function leerPorFirmar(): Promise<PorFirmar[]> { return []; }
export async function borrarPorFirmar() {}
export async function traerYGuardarPorFirmar() { const { data } = await cliente.get('/agreements/to-sign'); return data.data as PorFirmar[]; }
