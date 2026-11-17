# Seguridad

Revisión de seguridad de la API (Laravel 13 + Sanctum) y de la web (Next.js). Cada ítem dice qué se hizo, por qué y cómo se probó. Las pruebas se hicieron contra el backend corriendo (`php artisan serve`) con los usuarios de los seeders.

## Lista de control

- [x] Toda ruta de la API exige token, salvo el login
- [x] CORS permite solo los orígenes necesarios
- [x] El login admite 5 intentos por minuto (RateLimiter)
- [x] Búsquedas, estadísticas, exportación y descargas filtran por unidad
- [x] El archivo `.env` no está en Git
- [x] Las contraseñas se guardan con hash
- [x] Token Bearer en el encabezado como mecanismo equivalente a la protección CSRF

---

## 1. Toda ruta exige token, salvo el login

**Qué hay.** Todas las rutas de `routes/api.php` están dentro de `auth:sanctum`. El acceso tiene dos niveles de token:

| Token | Cuándo se entrega | Para qué sirve |
|---|---|---|
| Limitado (`mfa`) | Después de correo y contraseña | Solo para `/auth/mfa/verify` y `/auth/mfa/send-code` |
| Completo (`acceso`) | Después del código MFA correcto | Para el resto de la API |

Encima de eso, cada ruta controla el **rol** (middleware `role:`) y cada consulta controla la **unidad** (punto 4).

Hay dos rutas sin token:

- `POST /auth/login`: es la puerta de entrada.
- `GET /health`: responde solo `{"ok": true}`. No da datos, y la usa el script `iniciar-movil` para saber si el celular llega al backend.

**Cómo se probó.** Se llamó a **las 50 rutas** de la API sin token, armando las URL a partir de `php artisan route:list`:

| Respuesta | Rutas |
|---|---|
| 401 (no autenticado) | 48 |
| 422 (faltan datos) | 1: `POST /auth/login` |
| 200 | 1: `GET /health` |

Además, el token limitado del MFA no sirve para la API: `GET /agreements` con ese token responde **403**.

## 2. CORS: solo los orígenes necesarios

**Qué se encontró.** El proyecto no tenía `config/cors.php`, así que usaba el valor por defecto de Laravel: `allowed_origins => ['*']`. Cualquier sitio web podía leer desde el navegador las respuestas de la API.

**Qué se hizo.** Se creó [`backend/config/cors.php`](../backend/config/cors.php):

- Orígenes permitidos: los de la variable `CORS_ALLOWED_ORIGINS` del `.env`. Por defecto son `http://localhost:3000` y `http://127.0.0.1:3000`, donde corre la web.
- Métodos y encabezados: solo los que usa la web (`Authorization`, `Content-Type`, `Accept`).
- `supports_credentials => false`: la API no usa cookies (ver punto 7).

La app móvil no necesita estar en la lista, porque una app nativa no manda el encabezado `Origin` y CORS es una regla del navegador. Para publicar la web en otro dominio, ese dominio se agrega a `CORS_ALLOWED_ORIGINS` (está documentado en `.env.example`).

**Cómo se probó.** Se hizo un pedido de verificación previa (`OPTIONS`) desde tres orígenes:

| Origen | `Access-Control-Allow-Origin` |
|---|---|
| `http://localhost:3000` | `http://localhost:3000` (permitido) |
| `http://127.0.0.1:3000` | `http://127.0.0.1:3000` (permitido) |
| `https://sitio-ajeno.example` | (ninguno: el navegador bloquea la respuesta) |

También se probó en un navegador real (Edge):

- La web en `http://localhost:3000` carga el listado de convenios normalmente.
- Una página servida desde otro origen (`http://127.0.0.2:3000`) intentó leer `GET /api/agreements` **con un token válido**, y el navegador la bloqueó (`Failed to fetch`).

## 3. Login: 5 intentos por minuto

**Qué se encontró.** `POST /auth/login` no tenía límite, así que se podían probar contraseñas sin freno.

**Qué se hizo.** Se definió un limitador `login` con `RateLimiter::for()` en [`AppServiceProvider`](../backend/app/Providers/AppServiceProvider.php) y se aplicó a la ruta con `throttle:login`:

- **5 intentos por minuto**, contados por **correo + IP**. Contar solo por correo dejaría que alguien bloquee a otra persona desde su propia computadora. Contar solo por IP afectaría a todos los que comparten la red de la facultad.
- Al pasarse, responde **429** con el mensaje "Demasiados intentos. Esperá un minuto y volvé a probar." y el encabezado `Retry-After`. La web muestra ese mensaje en el login.

Este límite se suma a los que ya había en el segundo paso:

| Paso | Límite |
|---|---|
| Código MFA | 5 intentos fallidos y se anula el token limitado (hay que volver a iniciar sesión) |
| Envío del código por mail | 5 por minuto |

**Cómo se probó.**

| Prueba | Resultado |
|---|---|
| 7 intentos seguidos con contraseña incorrecta | `401 401 401 401 401 429 429` |
| Contraseña correcta mientras dura el bloqueo | 429 |
| Otro correo desde la misma IP | 200 (no queda bloqueado) |

## 4. Búsquedas, estadísticas, exportación y descargas filtran por unidad

**Qué hay.** Un usuario con unidad asignada (gestión, revisión o consulta de una facultad) solo ve los convenios de su unidad. Administración y los usuarios sin unidad ven todos. La regla está en un solo lugar, `Agreement::scopeVisiblesPara()`, y la usan todos los controladores que leen convenios.

Un convenio de otra unidad responde **404, no 403**, igual que uno que no existe. Así no se puede averiguar qué convenios hay en otras facultades.

**Cómo se probó.** Con `gestion.fa@demo.test` (Facultad de Agronomía, 1 convenio) pidiendo datos de FCEyN (5 convenios):

| Qué | Pedido | Resultado |
|---|---|---|
| Búsqueda | `GET /agreements` | 1 convenio, todos de su unidad |
| Búsqueda | `GET /agreements?q=CONV-2026-001` (de FCEyN) | 0 resultados |
| Ficha | `GET /agreements/1` (de FCEyN) | 404 |
| Estadísticas | `GET /dashboard` | total = 1 (admin ve 31) |
| Estadísticas | `GET /dashboard?unidad_id=3` (pide FCEyN a propósito) | total = 0 |
| Exportación | `GET /agreements/export?formato=csv` | 1 fila, ninguna de FCEyN |
| Exportación | Lo mismo con `consulta.fi@demo.test` (Ingeniería) | 14 filas, las de Ingeniería |
| Descargas | `GET /documents/1` y `/documents/1/download` (PDF de FCEyN) | 404 y 404 (admin: 200, `application/pdf`) |
| Datos personales | `GET /people` | 0 personas (admin ve 10) |

Las funciones que se agregaron después siguen la misma regla: el QR de la ficha (`GET /qr/{token}`), la sincronización (`POST /sync`), los avisos y la auditoría. Las pruebas de cada una están en su tarea.

## 5. El archivo `.env` no está en Git

`backend/.gitignore` excluye `.env`, `web/.gitignore` excluye `.env.local` y `mobile/.gitignore` excluye `.env`. En el repositorio solo está `backend/.env.example`, con valores de ejemplo.

**Cómo se probó.**

| Comando | Resultado |
|---|---|
| `git ls-files` (archivos `.env`) | Ninguno |
| `git log --all -- backend/.env web/.env web/.env.local mobile/.env` | 0 commits: nunca se subió, así que no quedó ninguna clave en la historia |

## 6. Las contraseñas se guardan con hash

El modelo `User` declara `'password' => 'hashed'`: Laravel aplica **bcrypt (12 rondas, `BCRYPT_ROUNDS`)** al guardar, y el login compara con `Hash::check()`. La contraseña nunca sale en una respuesta, porque está en `#[Hidden]` junto con el secreto y el código del MFA.

Otros datos sensibles tampoco se guardan en texto plano:

| Dato | Cómo se guarda |
|---|---|
| Token de Sanctum | SHA-256: el cliente recibe el valor, la base solo guarda su hash |
| Código MFA enviado por mail | Con hash, y vence a los 5 minutos |
| Secreto de Google Authenticator | Cifrado con la `APP_KEY` (cast `encrypted`) |
| "Huella" del dispositivo (identidad) | HMAC-SHA256: solo el hash, nunca el valor |

**Cómo se probó.** Los 13 usuarios de la base tienen hash `$2y$12$...` (bcrypt) y ninguno guarda "password" en texto plano. `GET /auth/me` no devuelve `password`, `mfa_secreto`, `mfa_codigo_hash` ni `remember_token`.

## 7. Token Bearer en el encabezado en lugar de CSRF

**El riesgo.** CSRF es un ataque en el que otro sitio hace que el navegador de la víctima mande un pedido a la API, y el navegador **agrega solo las cookies de sesión**. La defensa habitual en Laravel es el token CSRF, porque la sesión viaja en una cookie.

**Por qué acá no aplica.** La API no usa cookies de sesión:

- El token viaja en el encabezado `Authorization: Bearer <token>`, y la web lo agrega en cada pedido ([`web/src/lib/api.ts`](../web/src/lib/api.ts)).
- El navegador **nunca agrega ese encabezado por su cuenta**. Un sitio ajeno no conoce el token, así que no puede armar un pedido válido.
- Un pedido con `Authorization` desde otro origen exige una verificación previa CORS, que el punto 2 rechaza.
- `supports_credentials` está en `false` y `bootstrap/app.php` no activa el modo con cookies de Sanctum (`statefulApi()`).

Por eso **el token Bearer cumple la función que en una app con cookies cumple el token CSRF**.

**El costo de esta decisión.** El token se guarda en `localStorage`, que sí puede leer un script malicioso si la web tuviera una falla de XSS. Para limitar ese riesgo:

- React escapa todo el texto que muestra, y el proyecto no usa `dangerouslySetInnerHTML`.
- Al cerrar sesión, el token se revoca en el servidor.

## 8. Otros ajustes que salieron de la revisión

- **Archivos privados sin ruta directa.** El disco `local` (`storage/app/private`), donde están los PDF y los archivos de identidad, tenía `'serve' => true`. Eso registraba las rutas `GET` y `PUT /storage/{path}`, protegidas por firma. No se usaban, así que se apagaron (`'serve' => false`): esos archivos solo salen por controladores que controlan sesión, rol y unidad.
  - Prueba: antes, el pedido directo a un archivo de identidad daba 403; ahora, 404. La descarga de documentos por la API sigue funcionando (200, `application/pdf`).
- **Fotos de perfil.** Están en el disco público a propósito: la consigna pide una URL para la miniatura. Los nombres de archivo son UUID, así que no se pueden adivinar.
- **Otros límites de pedidos.**

  | Ruta | Límite |
  |---|---|
  | `GET /qr/{token}` | 60 por minuto |
  | `POST /sync` | 30 por minuto, con hasta 50 cambios por envío |

- **Auditoría.** Los cambios de estado, descargas, subidas, exportaciones, consultas de datos personales y generación de QR quedan en la tabla `auditoria`. Administración los ve en `/auditoria`.

## Pendiente para producción

Esto no hace falta en el entorno de desarrollo, pero sí al publicar el sistema:

| Qué | Por qué |
|---|---|
| `APP_DEBUG=false` y `APP_ENV=production` | Con debug activado, un error muestra el detalle interno (rutas de archivos, consultas) |
| HTTPS en la API y en la web | Sin HTTPS, el token Bearer viaja legible por la red |
| Agregar el dominio de la web a `CORS_ALLOWED_ORIGINS` | Si no, el navegador bloquea la web publicada |
| Definir un vencimiento para los tokens (`expiration` en `config/sanctum.php`, hoy sin vencimiento) | Hoy un token robado sirve hasta que se cierra sesión. Hay que elegir el plazo pensando en el uso sin conexión, que necesita que la sesión siga viva |
