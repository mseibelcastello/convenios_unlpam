// Tipos de parte (las instituciones que firman): la clave es lo que usa la API
export const PARTES: Record<string, string> = {
  universidad: "Universidad",
  organismo_publico: "Organismo público",
  empresa: "Empresa",
  asociacion: "Asociación",
  otra: "Otra",
};

// Rol de una parte dentro de un convenio
export const ROLES_PARTE: Record<string, string> = {
  UNLPam: "UNLPam",
  contraparte: "Contraparte",
  otro: "Otro",
};

// Tipos de documento (PDF) de un convenio
export const TIPOS_DOCUMENTO: Record<string, string> = {
  principal: "Principal",
  anexo: "Anexo",
  dictamen: "Dictamen",
  resolucion: "Resolución",
  otro: "Otro",
};

// Rol de una persona dentro de un convenio
export const ROLES_PERSONA: Record<string, string> = {
  representante: "Representante",
  responsable: "Responsable",
  docente_guia: "Docente guía",
  tutor: "Tutor",
  pasante: "Pasante",
};

// Tipos de vínculo entre convenios: la clave es lo que usa la API
export const VINCULOS: Record<string, string> = {
  se_apoya_en: "Se apoya en",
  adenda: "Adenda de",
  renovacion: "Renovación de",
  sustitucion: "Sustitución de",
};

// Tipos de convenio: la clave es lo que usa la API, el valor es lo que se muestra
export const TIPOS: Record<string, string> = {
  marco: "Marco",
  especifico: "Específico",
  pasantia: "Pasantía",
  adenda: "Adenda",
  renovacion: "Renovación",
  sustitucion: "Sustitución",
};
