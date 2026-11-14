// Días que faltan para una fecha "AAAA-MM-DD" (negativo si ya pasó)
export function diasHasta(fecha: string) {
  const hoy = new Date().setHours(0, 0, 0, 0);
  return Math.round((new Date(`${fecha}T00:00:00`).getTime() - hoy) / 86400000);
}

// "AAAA-MM-DD" -> "DD/MM/AAAA"
export function fechaLarga(fecha: string) {
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
