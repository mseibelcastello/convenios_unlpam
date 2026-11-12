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
  unidad?: { id: number; nombre: string } | null;
};

type ItemMenu = { href: string; texto: string; roles: Rol[] | "todos" };

// "Nuevo convenio" no aparece para revisión ni consulta (igual que el permiso
// de POST /agreements en la API).
const MENU: ItemMenu[] = [
  { href: "/", texto: "Inicio", roles: "todos" },
  { href: "/convenios", texto: "Convenios", roles: "todos" },
  { href: "/convenios/nuevo", texto: "Nuevo convenio", roles: ["administracion", "gestion"] },
  { href: "/vencimientos", texto: "Vencimientos", roles: "todos" },
  { href: "/usuarios", texto: "Usuarios", roles: ["administracion"] },
];

export function menuPara(rol: Rol) {
  return MENU.filter((i) => i.roles === "todos" || i.roles.includes(rol));
}
