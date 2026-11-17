import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { API_URL } from '@/api/config';
import { tokenParaApi } from '@/api/sesion';

// Descarga el PDF a un archivo temporal y abre el menú de compartir (WhatsApp, mail, etc.).
// La descarga usa el mismo permiso de siempre: si el usuario no puede ver el documento,
// la API responde error y no se comparte nada.
// Si algo falla, lanza un Error con un mensaje listo para mostrar.
export async function compartirDocumento(documentoId: number | string, nombre: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }

  // Un nombre sin caracteres raros, que siempre termine en .pdf
  const limpio = nombre.replace(/[^\w. -]+/g, '_');
  const archivo = new File(Paths.cache, limpio.toLowerCase().endsWith('.pdf') ? limpio : `${limpio}.pdf`);

  let descargado: File;
  try {
    const token = await tokenParaApi();
    descargado = await File.downloadFileAsync(`${API_URL}/documents/${documentoId}/download`, archivo, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
      idempotent: true, // si ya se compartió antes, pisa el archivo anterior
    });
  } catch (e) {
    const texto = e instanceof Error ? e.message : '';
    if (texto.includes('403')) throw new Error('No tenés permiso para compartir este documento.');
    if (texto.includes('404')) throw new Error('El documento no está disponible.');
    throw new Error('No se pudo descargar el documento. Revisá la conexión.');
  }

  await Sharing.shareAsync(descargado.uri, { mimeType: 'application/pdf', dialogTitle: 'Compartir documento' });
}
