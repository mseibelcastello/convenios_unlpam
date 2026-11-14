// A diferencia del layout, el template se vuelve a montar en cada navegación:
// por eso cada sección entra con un fade corto (ver .pagina en globals.css).
export default function Plantilla({ children }: { children: React.ReactNode }) {
  return <div className="pagina">{children}</div>;
}
