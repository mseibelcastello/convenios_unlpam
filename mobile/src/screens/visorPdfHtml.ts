// Página que se carga dentro del WebView para mostrar un PDF.
// Usa pdf.js (necesita internet para bajar la librería) porque el WebView de Android
// no sabe mostrar PDFs por sí solo. El PDF llega ya descargado, como texto base64.
//
// Avisa a la app con postMessage:
//   'fin'   → se llegó al final del documento (la app muestra el botón Firmar)
//   'error' → no se pudo mostrar el PDF
export function armarHtml(base64: string) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<!-- user-scalable=yes: permite el zoom con dos dedos -->
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes">
<style>
  body { margin: 0; background: #777; }
  canvas { display: block; width: 100%; margin-bottom: 8px; background: #fff; }
  #mensaje { color: #fff; font: 16px sans-serif; padding: 16px; }
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
<div id="paginas"><div id="mensaje">Cargando PDF…</div></div>
<script>
  function avisar(texto) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(texto);
  }

  function fallar(texto) {
    document.getElementById('paginas').innerHTML = '<div id="mensaje">' + texto + '</div>';
    avisar('error');
  }

  var listo = false; // true cuando ya se dibujaron todas las páginas

  // ¿Se está viendo el final de la página? (con zoom, visualViewport sabe qué parte se ve)
  function revisarFinal() {
    if (!listo) return;
    var v = window.visualViewport;
    var abajo = v ? v.pageTop + v.height : window.scrollY + window.innerHeight;
    if (abajo >= document.documentElement.scrollHeight - 20) avisar('fin');
  }
  window.addEventListener('scroll', revisarFinal);
  if (window.visualViewport) window.visualViewport.addEventListener('scroll', revisarFinal);

  async function mostrar() {
    if (typeof pdfjsLib === 'undefined') {
      return fallar('No se pudo cargar el visor. Revisá la conexión a internet.');
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    var binario = atob("${base64}");
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

    var pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    var contenedor = document.getElementById('paginas');
    contenedor.innerHTML = '';

    for (var n = 1; n <= pdf.numPages; n++) {
      var pagina = await pdf.getPage(n);
      var base = pagina.getViewport({ scale: 1 });
      // Se dibuja más grande que la pantalla para que no se pixele al hacer zoom
      var escala = (window.innerWidth / base.width) * 2;
      var vista = pagina.getViewport({ scale: escala });

      var canvas = document.createElement('canvas');
      canvas.width = vista.width;
      canvas.height = vista.height;
      contenedor.appendChild(canvas);
      await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vista }).promise;
    }

    listo = true;
    revisarFinal(); // por si el PDF es corto y ya se ve entero
  }

  mostrar().catch(function () { fallar('No se pudo mostrar el PDF.'); });
</script>
</body>
</html>`;
}
