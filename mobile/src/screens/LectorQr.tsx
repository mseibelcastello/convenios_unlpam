import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Lector de QR. El QR no trae datos del convenio: solo un identificador aleatorio.
// Al leerlo se pide GET /qr/{token}; el servidor responde con el convenio solo si la persona tiene permiso.

const SEGUNDOS = 60;

export default function LectorQr() {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [segundos, setSegundos] = useState(SEGUNDOS);
  const [consultando, setConsultando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Cuenta regresiva: si pasan 60 segundos sin reconocer ningún código, se cierra la pantalla con un aviso
  useEffect(() => {
    const reloj = setInterval(() => setSegundos((s) => s - 1), 1000);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (segundos > 0) return;
    router.back();
    Alert.alert('No se leyó ningún código', 'Pasaron 60 segundos sin reconocer un código QR. Probá de nuevo.');
  }, [segundos]);

  async function alLeer(texto: string) {
    if (consultando) return;
    // El QR de la web trae un enlace (https://…/qr/<token>); también se acepta el token solo
    const coincide = texto.trim().match(/(?:^|\/qr\/)([A-Za-z0-9_-]{8,128})\/?$/);
    if (!coincide) {
      setMensaje('Ese código QR no es de Convenios UNLPam.');
      return;
    }
    const token = coincide[1];

    setConsultando(true);
    setMensaje('');
    try {
      const { data } = await cliente.get(`/qr/${encodeURIComponent(token)}`);
      const id = data.id ?? data.convenio?.id;
      if (!id) throw new Error('Respuesta sin convenio');
      router.replace(`/convenio/${id}`);
    } catch (e) {
      const estado = axios.isAxiosError(e) ? e.response?.status : null;
      if (estado === 403) setMensaje('No tenés permiso para ver este convenio.');
      else if (estado === 404 || estado === 410) setMensaje('Este código QR no es válido o ya venció.');
      else setMensaje('No se pudo consultar el código. Revisá tu conexión y probá de nuevo.');
      setConsultando(false);
    }
  }

  function contenido() {
    if (!permiso) return null;

    if (!permiso.granted) {
      return (
        <View style={styles.centro}>
          <ThemedText>Hace falta el permiso de la cámara para leer el código QR.</ThemedText>
          <Button titulo="Dar permiso" onPress={pedirPermiso} />
        </View>
      );
    }

    return (
      <>
        <CameraView
          facing="back"
          style={styles.camara}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={consultando ? undefined : ({ data }) => alLeer(data)}
        />
        <View style={styles.pie}>
          <ThemedText themeColor="textSecondary">
            {consultando ? 'Consultando…' : `Apuntá la cámara al código QR. Se cierra en ${segundos} s.`}
          </ThemedText>
          {mensaje !== '' && (
            <ThemedText type="small" themeColor="error">
              {mensaje}
            </ThemedText>
          )}
        </View>
      </>
    );
  }

  return (
    <ThemedView conFondo style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <View style={styles.barra}>
          <Button titulo="Volver" variante="secundario" onPress={() => router.back()} />
        </View>
        {contenido()}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  barra: { padding: Spacing.three },
  camara: { flex: 1 },
  pie: { padding: Spacing.three, gap: Spacing.two },
  centro: { flex: 1, padding: Spacing.three, gap: Spacing.three, justifyContent: 'center' },
});
