import { isAxiosError } from "axios";
import { api } from "./api";

// Pide un archivo a la API (con el token) y se lo entrega al navegador para que lo guarde.
// Un enlace común no sirve porque la API exige el token en cada pedido.
// Si falla, lanza un Error con el mensaje de la API.
export async function descargarArchivo(ruta: string, nombre: string, params?: Record<string, unknown>) {
  try {
    const r = await api.get(ruta, { params, responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    // Con responseType "blob", el mensaje del error también llega como blob
    let texto = "No se pudo descargar el archivo.";
    if (isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        texto = JSON.parse(await err.response.data.text()).message ?? texto;
      } catch {}
    }
    throw new Error(texto);
  }
}
