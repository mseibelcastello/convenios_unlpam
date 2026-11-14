// Logos oficiales en public/logos (de unlpam.edu.ar, Identidad Institucional), en versión
// "-simbolo": solo el emblema y el símbolo de la facultad, sin letras, con el negro pasado a
// crema para verse sobre fondo oscuro.
// Las secretarías y los usuarios sin unidad usan el logo de la UNLPam.
const ARCHIVOS: Record<string, string> = {
  FA: "FA-simbolo.svg",
  FCEyJ: "FCEyJ-simbolo.svg",
  FCEyN: "FCEyN-simbolo.svg",
  FCH: "FCH-simbolo.svg",
  FCS: "FCS-simbolo.jpg",
  FCV: "FCV-simbolo.svg",
  FI: "FI-simbolo.svg",
};

type Props = { unidad?: { nombre: string; sigla?: string } | null };

export default function LogoUnidad({ unidad }: Props) {
  const archivo = unidad?.sigla ? ARCHIVOS[unidad.sigla] : undefined;
  const texto = archivo ? unidad!.nombre : "Universidad Nacional de La Pampa";

  return (
    <span className="logo-unidad">
      {/* Se usa <img> común: son archivos estáticos chicos y no hace falta optimizarlos */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/logos/${archivo ?? "UNLPam-simbolo.svg"}`} alt={texto} />
    </span>
  );
}
