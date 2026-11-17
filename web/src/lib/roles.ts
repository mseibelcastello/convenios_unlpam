export type Rol = "administracion" | "gestion" | "revision" | "consulta";

// Cómo se muestra cada rol
export const ROLES: Record<Rol, string> = {
  administracion: "Administración",
  gestion: "Gestión",
  revision: "Revisión",
  consulta: "Consulta",
};

export type Usuario = {
  id: number;
  name: string;
  email: string;
  rol: Rol;
  unidad?: { id: number; nombre: string; sigla?: string } | null;
};

// "grupo" es el título de la sección del menú lateral; "icono" es el nombre de un ícono de components/Iconos.tsx
type ItemMenu = { href: string; texto: string; icono: string; grupo: string; roles: Rol[] | "todos" };

// "Nuevo convenio" no aparece para revisión ni consulta (igual que el permiso
// de POST /agreements en la API).
const MENU: ItemMenu[] = [
  { href: "/", texto: "Inicio", icono: "inicio", grupo: "Principal", roles: "todos" },
  { href: "/convenios", texto: "Convenios", icono: "convenios", grupo: "Principal", roles: "todos" },
  { href: "/vencimientos", texto: "Vencimientos", icono: "vencimientos", grupo: "Principal", roles: "todos" },
  { href: "/convenios/nuevo", texto: "Nuevo convenio", icono: "nuevo", grupo: "Gestión", roles: ["administracion", "gestion"] },
  { href: "/revision", texto: "Panel de revisión", icono: "revision", grupo: "Revisión", roles: ["revision"] },
  { href: "/usuarios", texto: "Usuarios", icono: "usuarios", grupo: "Administración", roles: ["administracion"] },
  { href: "/auditoria", texto: "Auditoría", icono: "auditoria", grupo: "Administración", roles: ["administracion"] },
];

export function menuPara(rol: Rol) {
  return MENU.filter((i) => i.roles === "todos" || i.roles.includes(rol));
}
