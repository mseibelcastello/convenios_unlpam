import { isAxiosError } from "axios";

// Lee un error de la API. Devuelve un mensaje general y, si fue un 422,
// el primer mensaje de cada campo: { campo: "mensaje" }
export function leerError(err: unknown) {
  const campos: Record<string, string> = {};
  let mensaje = "No se pudo guardar.";

  if (isAxiosError(err) && err.response) {
    const { status, data } = err.response;
    mensaje = data?.message ?? mensaje;
    if (status === 422 && data.errors) {
      for (const campo in data.errors) campos[campo] = data.errors[campo][0];
    }
  }

  return { mensaje, campos };
}
