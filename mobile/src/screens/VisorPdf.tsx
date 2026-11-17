import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { armarHtml } from '@/screens/visorPdfHtml';

// Convierte los bytes del PDF en texto base64 para pasárselo al WebView
function aBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let texto = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    texto += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(texto);
}

export default function VisorPdf() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [html, setHtml] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [llegoAlFinal, setLlegoAlFinal] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(false);
    setLlegoAlFinal(false);
    try {
      // El cliente agrega el token solo (así la API deja descargar el PDF)
      const { data } = await cliente.get<ArrayBuffer>(`/documents/${id}/download`, {
        responseType: 'arraybuffer',
      });
      setHtml(armarHtml(aBase64(data)));
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [id]);

  function contenido() {
    if (cargando) return <LoadingView mensaje="Descargando el documento…" />;
    if (error || !html) {
      return <ErrorView mensaje="No se pudo abrir el documento." onReintentar={cargar} />;
    }
    return (
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        style={styles.visor}
        // El visor avisa 'fin' al llegar al final del PDF y 'error' si no pudo mostrarlo
        onMessage={(evento) => {
          if (evento.nativeEvent.data === 'fin') setLlegoAlFinal(true);
          if (evento.nativeEvent.data === 'error') setError(true);
        }}
        // Android: zoom con dos dedos, sin los botones + y -
        scalesPageToFit
        setBuiltInZoomControls
        setDisplayZoomControls={false}
      />
    );
  }

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <View style={styles.barra}>
          <Button titulo="← Volver" variante="secundario" onPress={() => router.back()} />
        </View>

        {contenido()}

        {/* Aparece recién al llegar al final del documento */}
        {llegoAlFinal && (
          <View style={styles.barra}>
            {/* La acción de firmar todavía no está hecha: por ahora solo se muestra el botón */}
            <Button titulo="Firmar" onPress={() => {}} />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  barra: { padding: Spacing.three },
  visor: { flex: 1 },
});
