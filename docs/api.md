## 1. Convenciones generales
- URL base: `/api`
- Formato: JSON (`Content-Type: application/json`). Exportaciones en PDF.
- Autenticación: `Authorization: Bearer <token>` en todas las rutas salvo `/auth/login`. `/auth/mfa/verify` usa el token limitado que devuelve el login.
- Fechas: `AAAA-MM-DD`. Fecha y hora: ISO 8601 con zona horaria.

### Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 401 | Sin sesión o token vencido | `{"message": "No autenticado"}` |
| 403 | Sin permiso por rol o unidad | `{"message": "Sin permiso"}` |
| 404 | No existe o está fuera de tu alcance | `{"message": "No encontrado"}` |
| 409 | Versión desactualizada | `{"message": "Conflicto de versión"}` |
| 422 | Validación | `{"message": "...", "errors": {"campo": ["..."]}}` |


## 2. Recursos
### 2.1 /auth
Entrar y salir del sistema. Incluye el login, el código MFA que verifica tu identidad y la consulta de quién sos (/auth/me). Devuelve el token que se usa en todo lo demás.

El segundo paso (MFA) se resuelve con un código de 6 dígitos de **Google Authenticator** (o cualquier app TOTP) o con un código que se manda al mail del usuario. La primera vez, el login devuelve el QR para activar la app; una vez activada, no se vuelve a mostrar. Con `MAIL_MAILER=log` el mail es simulado y queda en `storage/logs/laravel.log`.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| POST /auth/login | Público | `{email, password}` | 200 `{token, mfa_required: true, mfa_activado}` (token limitado, solo sirve para verificar el código). Si `mfa_activado` es false, trae además `otpauth_uri` (para el código QR) y `clave_manual` | 401, 422 |
| POST /auth/mfa/send-code | Token limitado | — | 200 (manda un código de 6 dígitos al mail del usuario; vale 5 minutos) | 401, 429, 502 |
| POST /auth/mfa/verify | Token limitado | `{codigo}` | 200 `{token, user}` (token completo) | 401, 422, 429 |
| POST /auth/logout | Autenticado | — | 200 | 401 |
| GET /auth/me | Autenticado | — | 200 `{user}` | 401 |


### 2.2 /users
Las personas que usan el sistema, cada una con su rol (administración, gestión, revisión o consulta) y su unidad. Solo Administración los crea y edita.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /users | Administración | query: `page` | 200 lista | 401, 403 |
| POST /users | Administración | `{nombre, correo, clave, rol, unidad_id}` | 201 | 401, 403, 422 |
| PUT /users/{id} | Administración | campos a cambiar | 200 | 401, 403, 404, 422 |


### 2.3 /unidades
Las facultades y secretarías de la UNLPam. Definen el alcance "su unidad" de los permisos.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /unidades | Todos | — | 200 lista | 401 |
| POST /unidades | Administración | `{nombre, sigla}` | 201 | 401, 403, 422 |


### 2.4 /agreements
El recurso central, los convenios. Cubre crear, buscar, ver la ficha, editar y cambiar de estado (borrador, revisión, aprobado, firmado...).

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /agreements | Todos, según alcance | query: `q, tipo, estado, unidad_id, anio, page` | 200 lista | 401, 403 |
| GET /agreements/{id} | Todos, según alcance | — | 200 ficha | 401, 403, 404 |
| POST /agreements | Administración; Gestión de su unidad | ficha | 201 | 401, 403, 422 |
| PUT /agreements/{id} | Administración; Gestión de su unidad | ficha + `version` | 200 | 401, 403, 404, 409, 422 |
| POST /agreements/{id}/transition | según la transición | `{estado, fundamento}` | 200 | 401, 403, 404, 422 |


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

### 2.9 /dashboard
Las estadísticas, con cantidades por estado, tipo, unidad y año, y convenios firmados y vigentes. También genera la exportación en PDF.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /dashboard | Todos, según alcance | query: `unidad_id?`, `anio?` | 200 estadísticas | 401, 403 |
| GET /dashboard/export | Administración; Gestión y Revisión de su unidad; Consulta de su unidad (sin datos personales) | mismos filtros que `GET /agreements` | 200 `text/csv` | 401, 403 |

La exportación se registra en `auditoria`.

### 2.10 /alerts
Los avisos de vencimiento, con convenios por vencer, en preaviso o ya vencidos. Calculados desde `fecha_vencimiento` y `fecha_preaviso`.

| Método y ruta | Quién | Cuerpo | OK | Errores |
|---|---|---|---|---|
| GET /alerts | Todos, según alcance | query: `dias?` (por defecto 30), `page` | 200 lista | 401, 403 |

Cada elemento: `{convenio_id, codigo, titulo, tipo, estado, fecha_vencimiento, fecha_preaviso, situacion}`.
`situacion`: `en_preaviso`, `por_vencer` o `vencido`.
Los convenios sin `fecha_vencimiento` no aparecen y se muestran como "sin vencimiento registrado" en la ficha.