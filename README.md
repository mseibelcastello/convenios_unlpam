# Convenios UNLPam

Sistema de gestión de convenios de la UNLPam.

## Estructura

| Carpeta    | Contenido                         |
|------------|-----------------------------------|
| `backend/` | API / servidor                    |
| `web/`     | Aplicación web                    |
| `mobile/`  | Aplicación móvil                  |
| `docs/`    | Documentación                     |

## Reglas de Git

1. **Una rama por tarea.** Se crea desde `main` y lleva el código de la tarea:
   `t005-nombre-corto` (por ejemplo `t005-modelo-convenio`).
2. **No se commitea directo a `main`.** Todo entra por pull request.
3. **El otro revisa el pull request.** Quien abre el PR no lo aprueba ni lo mergea sin la revisión de la otra persona.
4. El PR menciona la tarea (`T005`) en el título y describe brevemente qué cambia.
5. Después del merge se borra la rama.
6. Antes de empezar una tarea, actualizar `main` (`git pull`) y crear la rama desde ahí.
7. Commits chicos y con mensajes claros, en español.
