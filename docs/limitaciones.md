# Limitaciones conocidas

Lo que el sistema todavía no resuelve, o resuelve a medias. Cada punto dice por qué pasa y qué haría falta para cerrarlo. Cubre la API y la web; la app móvil se documenta aparte.

Estado de las pruebas: la colección de la API pasa completa (193 de 193 verificaciones, ver [pruebas-api.md](pruebas-api.md)). Lo de esta lista no aparece como fallo porque **no está en el contrato o no se puede probar de forma automática**.

## API

| Limitación | Por qué | Qué haría falta |
|---|---|---|
| Los mensajes de validación (422) salen **en inglés**, por ejemplo "The clave field must be at least 8 characters." | `APP_LOCALE=en` y el proyecto no tiene archivos de traducción. Los mensajes propios (404, 403, 405, 409, 429 y las reglas de negocio) sí están en castellano | Publicar los archivos de idioma (`php artisan lang:publish`), traducirlos al castellano y poner `APP_LOCALE=es` |
| Los tokens de sesión **no vencen** | `expiration` de Sanctum está en `null`. Un token robado sirve hasta que se cierra sesión o se cambia la clave (eso sí cierra todas las sesiones) | Elegir un vencimiento que no rompa el uso sin conexión (ver [seguridad.md](seguridad.md)) |
| `POST /sync` puede **duplicar comentarios** si el celular reenvía el mismo lote | Si se corta la conexión antes de recibir la respuesta, el cliente reintenta. Las ediciones no se duplican (la versión ya cambió), pero un comentario se crea de nuevo | Guardar el `id_cliente` de cada cambio aplicado y, si llega de nuevo, devolver el mismo resultado sin repetirlo |
| Los avisos de preaviso y vencido salen **una sola vez por convenio** | `deadlines:check` controla "un aviso por convenio y tipo". Si después le cambian la fecha de vencimiento (por ejemplo, con una adenda), no se vuelve a avisar | Guardar en el aviso la fecha de vencimiento a la que se refiere y avisar de nuevo si cambia |
| Casos sin prueba automática | `POST /auth/mfa/send-code` manda un mail real. Para `POST /auth/mfa/verify` hace falta el código del momento. `POST /agreements/{id}/sign` deja un convenio firmado sin vuelta atrás. Las subidas de identidad y foto necesitan imágenes que no están en el repositorio | Se probaron a mano en sus tareas. Para automatizarlas: un usuario de prueba con secreto TOTP conocido y un `MAIL_MAILER=log` en el entorno de pruebas |
| La regla "no dejar el sistema sin administración" no se puede probar por la API | Para bajar de rol al único administrador hace falta otro administrador, y entonces ya no sería el único. Solo se activaría con dos pedidos a la vez | Es una defensa ante esa carrera. Se puede probar con un test de PHPUnit que llame directo al controlador |

## Web

| Limitación | Por qué | Qué haría falta |
|---|---|---|
| "Usuarios" aparece en el menú de administración pero **no tiene pantalla** | La API de usuarios se terminó en la tarea 5.2; la pantalla no estaba en el plan de esta etapa | Una página `/usuarios` con la tabla, el alta y la edición, sobre `GET/POST/PUT /users` |
| Sin conexión solo se ven **convenios ya abiertos**, y solo navegando dentro de la web | Sin red, Next.js solo muestra páginas que ya pre-cargó, y eso pasa en la versión de producción (`npm run build` + `npm run start`), no con `npm run dev`. **Recargar** la página sin red no funciona | Un service worker (PWA) que guarde la estructura de la web, para poder abrirla en frío sin red |
| Sin conexión solo se pueden **editar los datos** del convenio | La cola de cambios y `POST /sync` cubren ediciones y comentarios. Agregar partes, personas, documentos, vínculos o responder observaciones necesita la API en el momento, y sin red esas acciones se ocultan | Extender la cola a esas acciones, con sus propias reglas de conflicto |
| Un QR escaneado **sin sesión iniciada** no vuelve al convenio | El panel manda al login y, después de entrar, va al inicio | Guardar la ruta pedida antes de mandar al login y volver a ella al terminar |
| En `/conflictos`, la ruta de arriba dice "Convenios UNLPam /" sin el nombre de la página | El encabezado toma el nombre del menú lateral, y esta página no está en el menú (se llega desde el aviso) | Que el encabezado tenga nombres para las páginas que no están en el menú |

## Puesta en producción

Lo que hay que cambiar al publicar el sistema está en [seguridad.md](seguridad.md), sección "Pendiente para producción": `APP_DEBUG=false`, HTTPS, el dominio de la web en `CORS_ALLOWED_ORIGINS` y el vencimiento de los tokens. Además, el comando diario de vencimientos necesita `php artisan schedule:run` en un cron (o `schedule:work`).
