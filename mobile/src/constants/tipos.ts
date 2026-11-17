// Tipos de convenio: valor que usa la API y texto para mostrar
export const TIPOS = [
  { valor: 'marco', texto: 'Marco' },
  { valor: 'especifico', texto: 'Específico' },
  { valor: 'pasantia', texto: 'Pasantía' },
  { valor: 'adenda', texto: 'Adenda' },
  { valor: 'renovacion', texto: 'Renovación' },
  { valor: 'sustitucion', texto: 'Sustitución' },
];

export function textoDelTipo(valor: string) {
  return TIPOS.find((t) => t.valor === valor)?.texto ?? valor;
}
