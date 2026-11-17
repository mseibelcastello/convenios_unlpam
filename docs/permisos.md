# Roles y matriz de permisos

Tarea 1.5, actualizada al cierre de la implementación (17/11/2026).

Definimos 4 roles: administración, gestión, revisión y consulta. Cada celda dice si el rol puede hacer la acción y si vale para todas las unidades (global) o solo para la unidad de la persona. Las unidades son las facultades y las secretarías. **El permiso lo controla el servidor en cada pedido, no solo la pantalla**: el rol, con el middleware `role:` de las rutas, y la unidad, con el filtro `Agreement::visiblesPara` en cada consulta.

| Acción | Administración | Gestión | Revisión | Consulta |
|---|---|---|---|---|
| Ver ficha | Sí, global | Sí, solo su unidad | Sí, solo su unidad | Sí, global (sin datos personales, observaciones ni firma) |
| Crear convenio | Sí, global | Sí, solo su unidad | No | No |
| Editar (borrador o devuelto) | Sí, global | Sí, solo su unidad | No | No |
| Enviar a revisión | No | Sí, solo su unidad | No | No |
| Aprobar o devolver | No | No | Sí, solo su unidad | No |
| Firmar | Sí, global | No | No | No |
| Subir documentos | Sí, global | Sí, solo su unidad | Sí, solo dictámenes de su unidad | No |
| Descargar documentos | Sí, global | Sí, solo su unidad | Sí, solo su unidad | Sí, global (solo firmados) |
| Ver estadísticas | Sí, global | Sí, solo su unidad | Sí, solo su unidad | Sí, global |
| Exportar (PDF o CSV) | Sí, global | Sí, solo su unidad | Sí, solo su unidad | Sí, global (sin datos personales) |
| Administrar usuarios y unidades | Sí, global | No | No | No |
| Ver auditoría | Sí, global | No | No | No |

**Qué ve cada rol:**
- **Administración:** ve todo en todas las unidades. Crea y edita convenios, firma, rescinde y archiva, administra usuarios y unidades, y es el único rol que ve la auditoría. No envía a revisión ni aprueba: esos pasos son de gestión y revisión.
- **Gestión:** trabaja solo con los convenios de su unidad. Los crea, los edita mientras están en borrador, carga partes, personas, vínculos y documentos, los envía a revisión y responde las observaciones.
- **Revisión:** trabaja solo con los convenios de su unidad. Anota y resuelve observaciones, aprueba o devuelve (devolver exige un fundamento) y sube dictámenes.
- **Consulta:** solo mira, sin datos personales, observaciones ni firma. No crea, no edita ni administra nada, y descarga solo documentos de convenios firmados.

**El alcance lo calcula el servidor** con la unidad del usuario, y la persona no puede cambiarlo desde la pantalla:
- Si el usuario **no tiene unidad**, el alcance es global. Así están Administración y Consulta en los datos de prueba.
- Si **tiene unidad**, el alcance es solo esa unidad. Gestión y revisión siempre tienen una; la API no deja crearlas sin unidad. Un usuario de consulta o de administración con unidad asignada también queda limitado a ella.

Un convenio fuera del alcance responde **404**, como si no existiera, para no revelar qué hay en otras unidades. Una acción que el rol no puede hacer responde **403**.

`rol` es un enum sin tildes (`administracion`, `gestion`, `revision`, `consulta`), para evitar problemas de codificación. Por defecto queda en `consulta`, el rol con menos permisos.

## Cambios respecto de la primera versión

La primera versión de esta matriz (tarea 1.5, octubre) se ajustó durante la implementación:

| Acción | Primera versión | Ahora | Por qué |
|---|---|---|---|
| Ver ficha, para gestión y revisión | Sí, global | Sí, solo su unidad | Las fichas internas incluyen datos personales, observaciones y la firma. Limitar también la lectura minimiza la exposición de datos, como pide el enunciado |
| Enviar a revisión, para administración | Sí, global | No | Cada paso del trámite queda en un solo rol: gestión envía, revisión aprueba o devuelve, administración firma |
| Aprobar o devolver, para administración | Sí, global | No | Separar quien carga de quien revisa evita que una misma persona apruebe su propio trabajo |
| Ver auditoría, para revisión | Sí, solo su unidad | No | La auditoría registra acciones de todas las personas, incluidas consultas de datos personales. Quedó en un solo rol |
| Exportar, para consulta | Sí, solo su unidad | Sí, global (o su unidad, si tiene una asignada) | Se unificó con la regla general del alcance: lo decide la unidad del usuario, no el rol |
| Administrar | Usuarios | Usuarios y unidades | Se agregó el alta de unidades (`POST /unidades`) |
