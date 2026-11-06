# Flujos y wireframes

Wireframes de baja fidelidad en `docs/wireframes/wireframes.html` (abrir en el navegador). Los datos son ficticios.

- **Web (tarea 1.9):** login, panel, listado y ficha. Cada una con estado normal, vacío, cargando y error.
- **Móvil (tarea 1.10):** login con MFA (2 pasos), home, buscador, firmador y perfil.

## Diferencias entre la web y el celular

1. **Navegación.** La web usa un menú lateral fijo con todas las secciones visibles. El celular usa una barra inferior con 4 destinos (Inicio, Buscar, Firmar, Perfil).
   *Por qué:* en pantalla chica el pulgar alcanza la parte baja y un menú lateral le quitaría ancho al contenido.

2. **Listados.** La web muestra una tabla con columnas, filtros visibles arriba y paginación numerada. El celular muestra tarjetas de una columna, búsqueda por texto, filtros como chips y carga de más resultados al llegar al final.
   *Por qué:* una tabla de seis columnas no entra en 360 px sin scroll horizontal, y los números de página son incómodos de tocar.

3. **Tareas principales.** La web sirve para cargar y editar fichas completas, revisar con observaciones y exportar CSV. El celular sirve para consulta rápida, avisos, lectura de QR, firma registrada y acceso con MFA o biometría.
   *Por qué:* en el celular se resuelven tareas cortas y en cualquier lugar; los formularios largos se hacen mejor con teclado y pantalla grande.
