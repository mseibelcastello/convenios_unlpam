<?php

/*
| CORS: qué páginas web pueden llamar a la API desde el navegador.
|
| Solo la web del proyecto. La app móvil no pasa por acá: una app nativa no manda el encabezado
| Origin, así que el navegador no interviene. Antes se usaba el valor por defecto de Laravel ('*'),
| que dejaba a cualquier sitio leer las respuestas de la API.
|
| Para agregar otro origen (por ejemplo, la web publicada o la IP de la compu en la red local),
| se listan separados por coma en CORS_ALLOWED_ORIGINS del .env.
*/

$origenes = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000'))
)));

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origenes,

    'allowed_origins_patterns' => [],

    // Authorization lleva el token Bearer; X-Requested-With lo manda axios en algunos casos
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    // Para que la web pueda leer el nombre del archivo en las descargas y cuánto esperar tras un 429
    'exposed_headers' => ['Content-Disposition', 'Retry-After'],

    'max_age' => 600,

    // Sin cookies: la sesión viaja en el encabezado Authorization (ver docs/seguridad.md)
    'supports_credentials' => false,

];
