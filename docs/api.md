## 1. Convenciones generales
- URL base: `/api`
- Formato: JSON (`Content-Type: application/json`). Exportaciones en PDF.
- Autenticación: `Authorization: Bearer <token>` en todas las rutas salvo `/auth/login` y `/health`. `/auth/mfa/verify` y `/auth/mfa/send-code` usan el token limitado que devuelve el login; ese token no sirve para el resto de la API (403).
- `GET /health` responde `{"ok": true}` sin token. Sirve para saber si el backend está andando.
- Fechas: `AAAA-MM-DD`. Fecha y hora: ISO 8601 con zona horaria.
- Seguridad (CORS, límites de intentos, filtrado por unidad): ver [seguridad.md](seguridad.md). Pruebas de este contrato: ver [pruebas-api.md](pruebas-api.md).

### Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 401 | Sin sesión o token vencido | `{"message": "No autenticado"}` |
| 403 | El **rol** no alcanza, o se usa el token limitado del login | `{"message": "Sin permiso"}` |
| 404 | No existe **o está fuera de tu unidad** (no se distingue, para no revelar qué hay en otras unidades) | `{"message": "No encontrado"}` |
| 409 | Conflicto: versión desactualizada al editar, o dato repetido (parte o vínculo ya asociados) | `{"message": "Conflicto de versión"}` y `actual` con el convenio de hoy, o el motivo del repetido |
| 405 | La ruta existe pero no con ese método (por ejemplo, POST a una que solo acepta GET) | `{"message": "Método no permitido"}` y encabezado `Allow` con los métodos que sí acepta |
| 422 | Validación | `{"message": "...", "errors": {"campo": ["..."]}}` |
| 429 | Demasiados pedidos (login: 5 por minuto; código MFA por mail: 5 por minuto) | `{"message": "..."}` y encabezado `Retry-After` |


## 2. Recursos
### 2.1 /auth
Entrar y salir del sistema. Incluye el login, el código MFA que verifica tu identidad y la consulta de quién sos (/auth/me). Devuelve el token que se usa en todo lo demás.

El segundo paso (MFA) se resuelve con un código de 6 dígitos de **Google Authenticator** (o cualquier app TOTP) o con un código que se manda al mail del usuario. La primera vez, el login devuelve el QR para activar la app; una vez activada, no se vuelve a mostrar. Con `MAIL_MAILER=log` el mail es simulado y queda en `storage/logs/laravel.log`.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| POST /auth/login | Público (5 intentos por minuto por correo e IP) | `{email, password}` | 200 `{token, mfa_required: true, mfa_activado, unidad}` (`unidad` es `{nombre, sigla}` o `null` si el usuario no tiene; token limitado, solo sirve para verificar el código). Si `mfa_activado` es false, trae además `otpauth_uri` (para el código QR) y `clave_manual` | 401, 422 |
| POST /auth/mfa/send-code | Token limitado | — | 200 (manda un código de 6 dígitos al mail del usuario; vale 5 minutos) | 401, 429, 502 |
| POST /auth/mfa/verify | Token limitado | `{codigo}` | 200 `{token, user}` (token completo) | 401, 422, 429 |
| POST /auth/logout | Autenticado | — | 200 | 401 |
| GET /auth/me | Autenticado | — | 200 `{user}`: incluye `tamano_letra`, `modo` y `miniatura_url` (ver 2.13) | 401, 403 (token limitado) |


### 2.2 /users
Las personas que usan el sistema, cada una con su rol (administración, gestión, revisión o consulta) y su unidad. Solo Administración los crea y edita.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /users | Administración | query: `q` (nombre o correo), `rol`, `unidad_id`, `page` | 200 `{data, meta}` (15 por página) | 401, 403 |
| POST /users | Administración | `{nombre, correo, clave, rol, unidad_id}` | 201 usuario | 401, 403, 422 |
| PUT /users/{id} | Administración | campos a cambiar (los mismos) | 200 usuario | 401, 403, 404, 422 |

Cada usuario: `{id, name, email, rol, unidad_id, unidad, mfa_activado, created_at}`. Nunca se devuelven la clave ni los datos del MFA.

Reglas (422 si no se cumplen):
- `correo` único. `clave` de al menos 8 caracteres; se guarda con hash (bcrypt).
- Gestión y revisión **exigen `unidad_id`**: trabajan sobre su unidad, y sin unidad verían todas. Administración y consulta pueden no tenerla (globales).
- Nadie puede cambiarse **su propio rol**, y el sistema no puede quedarse sin ningún usuario de administración.
- Si se cambia la clave, se cierran todas las sesiones abiertas de ese usuario.
- Crear y editar queda en `auditoria`.


### 2.3 /unidades
Las facultades y secretarías de la UNLPam. Definen el alcance "su unidad" de los permisos.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /unidades | Todos | — | 200 lista `[{id, nombre, sigla}]` | 401 |
| POST /unidades | Administración | `{nombre, sigla}` (los dos únicos; la sigla solo con letras, hasta 20) | 201 `{id, nombre, sigla}` | 401, 403, 422 |

Crear una unidad queda en `auditoria`.


### 2.4 /agreements
El recurso central, los convenios. Cubre crear, buscar, ver la ficha, editar y cambiar de estado (borrador, revisión, aprobado, firmado...).

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /agreements | Todos, según alcance | query: `q, tipo, estado, unidad_id, anio, page` | 200 `{data, meta}` (15 por página) | 401 |
| GET /agreements/{id} | Todos, según alcance | — | 200 ficha | 401, 404 |
| POST /agreements | Administración; Gestión de su unidad | ficha | 201 (nace en `borrador`, `version` 1) | 401, 403, 422 |
| PUT /agreements/{id} | Administración; Gestión de su unidad | ficha + `version` | 200 (`version` sube 1) | 401, 403, 404, 409, 422 |
| POST /agreements/{id}/transition | según la transición | `{estado, fundamento}` | 200 | 401, 403, 404, 422 |
| GET /agreements/export | Todos, según alcance | mismos filtros que `GET /agreements` + `formato` (`pdf` por defecto, o `csv`) | 200 `application/pdf` o `text/csv` | 401, 422 |

Detalles de las respuestas:
- En el listado, los roles internos (no consulta) reciben además `observaciones_pendientes` de cada convenio.
- La ficha trae `unidad`, `partes`, `qr_token` (null si no se generó el QR) y, para los roles internos, `personas`, `observaciones` y `firma`. Consultar una ficha con personas queda auditado.
- La exportación queda registrada en `auditoria`.

Transiciones (quién, y qué exige):

| De → a | Quién | Exige |
|---|---|---|
| borrador → revision | Gestión | — |
| revision → borrador (devolver) | Revisión | `fundamento`, que además queda como **observación** para que gestión la responda |
| revision → aprobado | Revisión | Ninguna observación sin resolver, al menos 2 partes, PDF principal y, en específicos y pasantías, el marco firmado y vigente |
| aprobado → firmado | Administración (ver 2.12, firma) | Fechas de firma e inicio |
| firmado → rescindido | Administración | `fundamento` |
| firmado o rescindido → archivado | Administración | — |


### 2.5 /parties
Las instituciones que firman un convenio (universidades, empresas, organismos) y sus representantes.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /parties | Todos | query: `q`, `tipo`, `page` | 200 lista | 401 |
| GET /parties/{id} | Todos | — | 200 parte | 401, 404 |
| POST /parties | Administración; Gestión ⚠️ | `{nombre, tipo, representante?, cargo_representante?}` | 201 parte | 401, 403, 422 |
| PUT /parties/{id} | Administración; Gestión ⚠️ | campos a cambiar | 200 parte | 401, 403, 404, 422 |
| POST /agreements/{id}/parties | Administración; Gestión de su unidad | `{parte_id, rol_parte}` | 201 | 401, 403, 404, 409 (par repetido), 422 |
| DELETE /agreements/{id}/parties/{parte_id} | Administración; Gestión de su unidad | — | 200 | 401, 403, 404, 422 (convenio ya aprobado) |

Valores de `tipo`: universidad, organismo público, empresa, asociación u otra. `rol_parte`: UNLPam, contraparte u otro.
Un convenio no pasa a *aprobado* si tiene menos de 2 partes (422 en la transición).

### 2.6 /people
Las personas vinculadas a un convenio, como el pasante, el tutor o el docente guía. Su consulta queda auditada.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /people | Administración; Gestión y Revisión de su unidad | query: `q`, `page` | 200 lista | 401, 403 |
| POST /people | Administración; Gestión de su unidad | `{nombre, legajo?}` (legajo `LEG-NNNN`, único) | 201 | 401, 403, 422 |
| GET /agreements/{id}/people | Administración; Gestión y Revisión de su unidad | — | 200 lista | 401, 403, 404 |
| POST /agreements/{id}/people | Administración; Gestión de su unidad | `{persona_id, rol, desde?, hasta?, carrera?, tutor?, carga_horaria?, asignacion?, seguro?}` | 201 | 401, 403, 404, 422 |
| DELETE /agreements/{id}/people/{persona_id} | Administración; Gestión de su unidad | — | 200 | 401, 403, 404 |

Roles: representante, responsable, docente guía, tutor o pasante.
Si `rol` es pasante, son obligatorios `desde`, `hasta` (de 2 a 12 meses), `carrera`, `tutor`, `carga_horaria` (1 a 20 h por semana), `asignacion` (≥ 0) y `seguro`; si falta alguno, 422.
Consulta no accede a este recurso (403): no ve datos personales.

### 2.7 /documents
Los PDF de un convenio: principal, anexo, dictamen, resolución. Se suben, se descargan por la API con control de permiso y llevan un SHA-256 para detectar alteraciones.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /agreements/{id}/documents | Según alcance | — | 200 lista (metadatos) | 401, 403, 404 |
| POST /agreements/{id}/documents | Administración; Gestión de su unidad; Revisión de su unidad (solo tipo dictamen) | `multipart/form-data`: `archivo` (PDF), `tipo` | 201 documento | 401, 403, 404, 422 |
| GET /documents/{id} | Según alcance | — | 200 metadatos y marca | 401, 403, 404 |
| GET /documents/{id}/download | Administración; Gestión y Revisión de su unidad; Consulta (global, solo convenios firmados) | — | 200 `application/pdf` | 401, 403, 404, 422 |

Reglas de la subida:
- Solo PDF de hasta 20 MB (20.971.520 bytes); si no, 422.
- `tipo`: principal, anexo, dictamen, resolución u otro.
- El servidor calcula el `sha256`, asigna la `version` (sube 1 por cada `convenio_id` + `tipo`) y guarda `subido_por` y `subido_en`.
- Las cargas anteriores se conservan: no se sobrescribe.
- La API agrega la **marca en los metadatos** del PDF (usuario, convenio, fecha y hora) antes de guardarlo. La marca se devuelve en `GET /documents/{id}`.
- Respuesta 201: `{id, convenio_id, tipo, version, nombre_original, tamano_bytes, sha256, subido_por, subido_en, marca}`.

Sha-256:
Detecta si un documento fue alterado:
1. Cuando alguien sube un PDF, el servidor calcula su SHA-256 y lo guarda en la tabla documentos.
2. Cuando alguien lo descarga, el servidor lo vuelve a calcular y lo compara con el guardado.
3. Si no coinciden, el archivo cambió desde que se subió, y la API responde con error.

Descarga: pasa siempre por la API, nunca por URL pública. Se recalcula el SHA-256 y, si no coincide, responde 422 con "archivo alterado". Queda registrada en `auditoria` como "descargar".

### 2.8 /agreements/{id}/links
Las relaciones entre convenios. Un específico se une con su marco, una adenda con el original, una renovación o sustitución con su antecedente. Sirve para armar el árbol padre e hijo.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /agreements/{id}/links | Según alcance | — | 200 `{antecedentes: [...], derivados: [...]}` | 401, 403, 404 |
| POST /agreements/{id}/links | Administración; Gestión de su unidad | `{convenio_destino_id, tipo_vinculo}` | 201 vínculo | 401, 403, 404, 409 (par repetido), 422 |
| DELETE /agreements/{id}/links/{link_id} | Administración; Gestión de su unidad | — | 200 | 401, 403, 404 |

Aquí `{id}` es el convenio origen (el específico, la adenda, la renovación). `convenio_destino_id` es el antecedente (el marco o el original).
`tipo_vinculo`: se apoya en, adenda, renovación o sustitución.
Reglas (422 si no se cumplen):
- Origen y destino no pueden ser el mismo convenio.
- Un convenio específico se vincula a uno o más marcos del mismo tipo (colaboración o pasantía).
- Cada elemento de la respuesta lleva `{id, codigo, titulo, tipo, estado, tipo_vinculo}`, para armar el árbol padre, hijo, resoluciones y documentos que pide la app.

#### Línea de vida: GET /agreements/{id}/lifeline
`/links` devuelve solo el primer nivel. La línea de vida devuelve **toda la cadena** a la que pertenece el convenio: por ejemplo, el marco, su renovación, sus específicos y las adendas de esos específicos. Se puede pedir desde cualquier convenio de la cadena.

| Método y ruta | Quién | OK | Errores |
|---|---|---|---|
| GET /agreements/{id}/lifeline | Todos, según alcance | 200 `{convenio_id, hoy, resumen, tramos: [...]}` | 401, 404 |

- `tramos` viene **ordenado por fecha**: por la de inicio, o la de firma si no tiene. Los que todavía no tienen fechas (en trámite) van al final.
- Cada tramo trae `tipo` (el tipo de instrumento), `codigo`, `titulo`, `estado`, `unidad`, `fecha_firma`, `fecha_inicio`, `fecha_vencimiento`, `situacion`, `dias_para_vencer` (negativo si ya venció), `es_el_consultado` y `vinculos`.
- `vinculos` dice con qué otros tramos se relaciona cada uno: `{tipo_vinculo, relacion: "antecedente"|"derivado", convenio_id, codigo}`.
- `situacion` usa la misma regla que los avisos de vencimiento (`deadlines:check`):

  | Valor | Cuándo |
  |---|---|
  | `vigente` | Firmado, antes del preaviso (o sin vencimiento) |
  | `proximo_a_vencer` | Firmado, ya dentro del período de preaviso |
  | `vencido` | Firmado, con el vencimiento ya pasado |
  | `en_tramite` | Borrador, revisión o aprobado: todavía no rige |
  | `rescindido`, `archivado` | Terminado |
- `resumen` cuenta los tramos por situación.
- **Alcance**: la cadena solo pasa por convenios que el usuario puede ver. Un convenio de otra unidad no aparece y tampoco sirve de puente para llegar a otros.

### 2.9 /dashboard
Las estadísticas, con cantidades por estado, tipo, unidad y año, convenios firmados y vigentes, y las listas de **próximos a vencer** (30 días) y **vencidos**. La exportación del listado está en `GET /agreements/export` (2.4).

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /dashboard | Todos, según alcance | query: `unidad_id?`, `anio?` | 200 estadísticas | 401 |

Pedir `unidad_id` de otra unidad no da error: devuelve todo en cero (el filtro por unidad se aplica igual).

### 2.10 /alerts
Los avisos de cada usuario (tabla `notificaciones`). Se crean solos cuando pasa algo en un convenio que el usuario puede ver; quien hizo la acción no se avisa a sí mismo.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /alerts | Autenticado (solo los suyos) | query: `no_leidas?` (1 = solo los no leídos), `page` | 200 `{data, meta}`; `meta.no_leidas` es el número de la campana | 401 |
| POST /alerts/{id}/read | Autenticado (solo los suyos) | — | 200 aviso | 401, 404 (no existe o es de otro usuario) |

Cada elemento: `{id, tipo, texto, leida, fecha, convenio: {id, codigo, titulo, estado, fecha_vencimiento}, enlace}`. `enlace` es la ruta de la ficha en la web (`/convenios/{id}`).

| `tipo` | Cuándo | A quién |
|---|---|---|
| `convenio_creado` | Se crea un convenio | Administración y gestión |
| `datos_modificados`, `comentario` | Se editan los datos o se comenta | Administración, gestión y revisión |
| `revision_asignada` | Pasa a revisión | Revisión (administración y gestión reciben `cambio_estado`) |
| `cambio_estado` | Cualquier otro cambio de estado | Administración, gestión y revisión |
| `rescindido` | Se rescinde | Todos los que lo ven, consulta incluida |
| `preaviso`, `vencido` | Lo detecta el comando diario `deadlines:check` (una sola vez por convenio) | Administración y gestión |

### 2.11 Observaciones y comentarios
Las **observaciones** son el ida y vuelta de la revisión: revisión anota, gestión responde una vez y revisión la da por resuelta. Con alguna sin resolver, el convenio no se aprueba. Los **comentarios** son notas internas libres; si tienen una palabra ofensiva, se guarda solo el aviso "comentario ofensivo" y el texto original no queda en ningún lado.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /agreements/{id}/observations | Administración; Gestión y Revisión de su unidad | — | 200 `{data, meta}` | 401, 403, 404 |
| POST /agreements/{id}/observations | Revisión, con el convenio en revisión | `{contenido}` | 201 observación | 401, 403, 404, 422 |
| POST /observations/{id}/reply | Gestión, Administración (convenio en borrador o revisión) | `{respuesta}` | 200 | 401, 403, 404, 422 (ya respondida o resuelta) |
| POST /observations/{id}/resolve | Revisión (convenio en revisión) | — | 200 | 401, 403, 404, 422 (ya resuelta) |
| GET /agreements/{id}/comments | Administración; Gestión y Revisión de su unidad | query: `page` | 200 `{data, meta}` | 401, 403, 404 |
| POST /agreements/{id}/comments | Administración; Gestión y Revisión de su unidad | `{contenido}` (hasta 2000) | 201 comentario | 401, 403, 404, 422 |

Observación: `{id, contenido, autor, fecha, respuesta, respondida_por, respondida_en, resuelta, resuelta_por, resuelta_en}`.

### 2.12 Firma
Administración firma un convenio aprobado. Queda guardado quién, cuándo, dónde (coordenadas) y, si se manda, la imagen de la firma dibujada.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /agreements/to-sign | Administración | — | 200 `{data, meta}`: los aprobados pendientes de firma (hasta 10, los más recientes; `meta.total` cuenta todos) | 401, 403 |
| POST /agreements/{id}/sign | Administración | `{latitud, longitud, fecha_firma?, fecha_inicio?, fecha_vencimiento?, firma_imagen?}` (`firma_imagen`: PNG en base64) | 200 convenio firmado + `firma` | 401, 403, 404, 422 |

Sin fechas, se firma hoy y el convenio empieza hoy. El preaviso se calcula 60 días antes del vencimiento.

### 2.13 Mi cuenta: identidad y perfil

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /me/identity | Autenticado | — | 200 `{firma, rostro, huella, completa}` (cada una `{registrada, fecha}`) | 401 |
| POST /me/identity | Autenticado | `multipart/form-data`: `firma` y `rostro` (PNG o JPG, de 50 a 4096 px), `huella` (identificador del dispositivo, 8 a 128 caracteres). Al menos uno | 200 mismo formato que el GET | 401, 422 |
| PUT /me/preferences | Autenticado | `{tamano_letra: chica\|mediana\|grande, modo: claro\|oscuro}` | 200 | 401, 422 |
| POST /me/photo | Autenticado | `multipart/form-data`: `foto` (PNG o JPG, de 100 a 4096 px, hasta 5 MB) | 200 `{miniatura_url}` (150×150) | 401, 422 |

Los archivos de identidad se guardan en la carpeta privada y no se pueden descargar. De la huella se guarda solo un hash. Las preferencias y la miniatura vuelven en `GET /auth/me`.

### 2.14 QR de la ficha
El QR lleva solo una referencia aleatoria, no datos del convenio. Abrirlo exige sesión y permiso sobre el convenio.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| POST /agreements/{id}/qr | Administración; Gestión de su unidad | — | 200 `{token, ruta}` (token de 32 caracteres; si ya existía, el mismo) | 401, 403, 404 |
| GET /qr/{token} | Todos, según alcance (60 por minuto) | — | 200 la misma respuesta que `GET /agreements/{id}` | 401, 404 (no existe o sin permiso) |

### 2.15 Sincronización (cambios hechos sin conexión)

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| POST /sync | Autenticado; cada cambio con las reglas de su acción (30 por minuto) | `{cambios: [{id_cliente, tipo: edicion\|comentario, convenio_id, version, datos? , contenido?}]}` (1 a 50) | 200 `{resumen: {aplicados, conflictos, rechazados}, resultados: [...]}` | 401, 422 |

Regla de conflictos: una **edición** se aplica solo si `version` es la del servidor y el convenio sigue en borrador. Si no, vuelve como `conflicto` con el convenio `actual` y no se pisa nada. Un **comentario** se aplica siempre. Cada cambio es independiente.

### 2.16 Auditoría

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /audit | Administración | query: `convenio_id?`, `accion?`, `page` | 200 `{data, meta, filtros}` (25 por página) | 401, 403, 422 |

Cada registro: `{id, fecha, usuario: {id, nombre, rol}, accion, entidad, entidad_id, convenio, estado_anterior, estado_nuevo, fundamento}`. `filtros` trae las acciones y convenios que aparecen, para armar los filtros.