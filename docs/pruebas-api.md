# Pruebas de la API

Prueba de cada endpoint contra el contrato de [api.md](api.md). Por cada uno se probó el caso correcto y al menos un error (401, 403, 404, 409 o 422). Los endpoints que existen en la API pero no figuran en el contrato también se probaron.

- **Colección:** [coleccion-api.postman.json](coleccion-api.postman.json), en formato Postman v2.1. También la importa Thunder Client.
- **Corridas:** 17/11/2026, con Newman (el ejecutor de colecciones de Postman por línea de comandos), contra el backend local con los datos de los seeders.

| Corrida | Contra | Peticiones | Verificaciones | Pasan | Fallan |
|---|---|---|---|---|---|
| 1.ª | `api.md` como estaba | 107 | 182 | 171 | **11** |
| 2.ª | `api.md` corregido con lo que salió de la 1.ª | 106 | 180 | 172 | **8**: solo `/users` y `POST /unidades`, que quedaron como pendientes |

## Resultado de la primera corrida

**107 peticiones · 182 verificaciones · 171 pasan · 11 fallan.**

Cada petición tiene tests que comparan la respuesta con el contrato: el código HTTP y, en los errores, el cuerpo (por ejemplo `{"message": "No autenticado"}`, o un 422 con el objeto `errors`). En los casos correctos también se revisan datos clave: que un convenio nuevo nazca en borrador con versión 1, que la descarga sea `application/pdf`, que la línea de vida venga ordenada por fecha, etc.

| Carpeta | Peticiones | Sin fallos | Verificaciones que pasan |
|---|---|---|---|
| 00 · Salud | 1 | 1 | 2/2 |
| 01 · Auth | 9 | 9 | 17/17 |
| 02 · Usuarios y unidades | 8 | 2 | **4/12** |
| 03 · Convenios | 11 | 11 | 22/22 |
| 04 · Partes | 11 | 11 | 16/16 |
| 05 · Personas | 10 | 10 | 15/15 |
| 06 · Documentos | 8 | 8 | 15/15 |
| 07 · Vínculos y línea de vida | 8 | 8 | 14/14 |
| 08 · Estados y observaciones | 15 | 15 | 23/23 |
| 09 · Estadísticas y exportación | 6 | 5 | **9/11** |
| 10 · Avisos | 3 | 2 | **5/6** |
| 11 · Auditoría, QR y sincronización | 9 | 9 | 16/16 |
| 12 · Mi cuenta (identidad y perfil) | 5 | 5 | 9/9 |
| 13 · Firma | 2 | 2 | 3/3 |
| 14 · Cerrar sesión | 2 | 2 | 3/3 |

Los recursos centrales (convenios, partes, personas, documentos, vínculos, estados) cumplen el contrato en todos los casos probados, incluidos el 409 por versión vieja, los 403 por rol y los 404 por unidad.

## Lista de fallos: lo que no responde como dice el contrato

Estado después de la primera corrida:

| # | Fallo | Estado |
|---|---|---|
| 1 | `/users` no implementado | **Pendiente**: quedó marcado así en `api.md`. Es una decisión del equipo implementarlo o quitarlo |
| 2 | `POST /unidades` no implementado | **Pendiente**, igual que el 1 |
| 3 | `/dashboard/export` no existe | **Corregido en el contrato**: la exportación figura en `GET /agreements/export` (api.md 2.4) |
| 4 | `/alerts` con otro formato | **Corregido en el contrato**: api.md 2.10 describe los avisos implementados y suma `POST /alerts/{id}/read` |
| 5 | El 405 sale en inglés y con detalle interno | **Corregido en la API**: `bootstrap/app.php` lo responde como los demás errores, con `{"message": "Método no permitido"}` y el encabezado `Allow`. Agregado a la tabla de errores de api.md |

El detalle de cada uno:

| # | Endpoint | El contrato dice | La API responde | Qué corresponde |
|---|---|---|---|---|
| 1 | `GET /users`, `POST /users`, `PUT /users/{id}` | 200 / 201 / 200 para administración, 403 para el resto | **404** para todos: el recurso no está implementado | Implementar la gestión de usuarios o quitarla del contrato. Hoy los usuarios se cargan con los seeders, y la web tiene "Usuarios" en el menú de administración sin página detrás |
| 2 | `POST /unidades` | 201 para administración, 403 para el resto | **405** "The POST method is not supported…": solo existe `GET` | Implementarlo o quitarlo del contrato (las unidades hoy salen del seeder) |
| 3 | `GET /dashboard/export` | 200 `text/csv` | **404**: la exportación está en `GET /agreements/export?formato=csv\|pdf` | Corregir la ruta en el contrato y agregar que también exporta PDF (`formato=pdf`, el valor por defecto) |
| 4 | `GET /alerts` | Lista de vencimientos calculados: `{convenio_id, codigo, titulo, tipo, estado, fecha_vencimiento, fecha_preaviso, situacion}`, con query `dias` | Los **avisos guardados** de la tarea 4.1: `{id, tipo, texto, leida, fecha, convenio{...}, enlace}`. Ignora `dias` y trae `meta.no_leidas` | Actualizar el contrato al diseño implementado. Los vencimientos calculados están hoy en `GET /dashboard` y en la línea de vida |
| 5 | Respuesta 405 | Todos los errores con `{"message": "..."}` en castellano | El 405 sale en inglés y, con `APP_DEBUG=true`, incluye la clase interna de la excepción | Agregar el 405 al manejador de errores de `bootstrap/app.php`, como el 401, 403 y 404. Con `APP_DEBUG=false` (ver [seguridad.md](seguridad.md)) desaparece el detalle interno |

### Diferencias menores (los tests se ajustaron a lo que hace la API)

- **El 409 no siempre es "Conflicto de versión".** La tabla general de errores lo define así, pero en partes y vínculos el 409 es "par repetido" y el mensaje dice "La parte ya está asociada al convenio" o "El vínculo ya existe". El código es el correcto y el contrato lo aclara en cada recurso. Conviene que la tabla general diga "Conflicto (versión desactualizada o dato repetido)".
- **Fuera de alcance da 404, no 403.** Varias filas del contrato listan "401, 403, 404" para un convenio de otra unidad, pero la API responde **404**, igual que si no existiera. Así no se puede averiguar qué hay en otras unidades. Es la decisión correcta (ver [seguridad.md](seguridad.md), punto 4) y ya figura en la tabla de errores ("No existe o está fuera de tu alcance"). Los 403 quedan para cuando el **rol** no alcanza.
- **Códigos que el contrato no menciona:**

  | Endpoint | Código | Cuándo |
  |---|---|---|
  | `POST /auth/login` | 429 | Más de 5 intentos por minuto (tarea 4.14) |
  | `/auth/me` y el resto de la API | 403 | Con el token limitado del primer paso del login |

Estas tres diferencias también se corrigieron en el contrato: la tabla de errores de api.md ahora tiene el 409 ampliado, el 404 por alcance y el 429.

### Endpoints que existían y no estaban en el contrato

Se probaron igual (caso correcto y error) y todos responden bien. **Después de la primera corrida se agregaron a `api.md`** (secciones 2.10 a 2.16 y convenciones):

| Endpoint | Para qué |
|---|---|
| `GET /health` | Comprobar que el backend responde (sin token) |
| `GET/POST /agreements/{id}/observations`, `POST /observations/{id}/reply`, `POST /observations/{id}/resolve` | Observaciones de revisión |
| `GET/POST /agreements/{id}/comments` | Comentarios internos (con filtro de palabras ofensivas) |
| `GET /agreements/to-sign`, `POST /agreements/{id}/sign` | Firma con identidad |
| `GET/POST /me/identity`, `PUT /me/preferences`, `POST /me/photo` | Identidad y perfil |
| `POST /alerts/{id}/read` | Marcar un aviso como leído |
| `GET /audit` | Auditoría (solo administración) |
| `POST /agreements/{id}/qr`, `GET /qr/{token}` | QR de la ficha |
| `POST /sync` | Cambios hechos sin conexión |

## Lo que no se prueba automáticamente

| Caso | Por qué |
|---|---|
| `POST /auth/mfa/send-code` correcto | Manda un mail real. Solo se prueba el 401 |
| `POST /auth/mfa/verify` correcto | Necesita el código de 6 dígitos del momento. En la colección se prueban el código incorrecto (401) y el vacío (422) |
| `POST /agreements/{id}/sign` correcto | Deja firmado uno de los convenios aprobados de los datos de prueba, y no se puede volver atrás. Se prueba el 403 por rol |
| `POST /me/photo` y `POST /me/identity` correctos | Necesitan imágenes que no están en el repositorio. Se probaron a mano en las tareas 3.8 y 3.9 |

## Cómo correr la colección

1. Levantar el backend (`php artisan serve`) con los seeders cargados.
2. Importar `docs/coleccion-api.postman.json` en Postman o en Thunder Client.
3. Completar las variables de la colección con tokens completos (login + código MFA):

   | Variable | Usuario |
   |---|---|
   | `tokenAdmin` | admin@demo.test |
   | `tokenGestion` | gestion@demo.test |
   | `tokenRevision` | revision@demo.test |
   | `tokenConsulta` | consulta@demo.test |
   | `tokenOtraUnidad` | gestion.fa@demo.test |
   | `tokenLogout` | Un token más de cualquier usuario: se cierra al final |

4. Correr las carpetas **en orden** (Run collection). Las primeras crean un convenio de prueba `CONV-2099-NNN` con su parte, persona y documento, que usan las siguientes.
5. Después, borrar los datos de prueba: el convenio `CONV-2099-…` (sus documentos, observaciones, comentarios y avisos se borran en cascada; el PDF queda en `storage/app/private/convenios/{id}`), la parte "Parte de prueba API" y la persona "Persona de prueba API". Los registros de auditoría se conservan a propósito.

Desde la terminal se puede correr igual con Newman:

```
npx newman run docs/coleccion-api.postman.json -e entorno.json
```

donde `entorno.json` tiene esas variables. Hay que correrlo desde la carpeta raíz del repositorio, para que encuentre los PDF de `archivos-de-prueba/`.
