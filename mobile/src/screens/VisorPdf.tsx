import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { cliente } from '@/api/cliente';
import { compartirDocumento } from '@/api/compartir';
import { actualizarRecordatorioFirma } from '@/api/recordatorios';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { FirmaManuscrita } from '@/components/organisms/FirmaManuscrita';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { armarHtml } from '@/screens/visorPdfHtml';

// Lo que usamos de las respuestas de la API
type Convenio = { id: number; codigo: string; titulo: string; estado: string };
type ConvenioFirmado = Convenio & { firma: { fecha: string; latitud: number; longitud: number } };

// Convierte los bytes del PDF en texto base64 para pasárselo al WebView
function aBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let texto = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    texto += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(texto);
}

// Un dato de la pantalla "Convenio firmado": etiqueta chica arriba y valor abajo
function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText>{valor}</ThemedText>
    </View>
  );
}

export default function VisorPdf() {
  const theme = useTheme();
  // id: el documento. convenio: el convenio al que pertenece (lo manda la ficha)
  const { id, convenio: convenioId, nombre } = useLocalSearchParams<{ id: string; convenio?: string; nombre?: string }>();

  const [html, setHtml] = useState<string | null>(null);
  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [rol, setRol] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [llegoAlFinal, setLlegoAlFinal] = useState(false);

  // Para firmar
  const [firmando, setFirmando] = useState(false);
  const [pidiendoFirma, setPidiendoFirma] = useState(false); // se ve el cuadro para firmar a mano
  const [mensaje, setMensaje] = useState('');
  const [firmado, setFirmado] = useState<ConvenioFirmado | null>(null);
  const [imagenFirma, setImagenFirma] = useState('');

  // Para compartir
  const [compartiendo, setCompartiendo] = useState(false);
  const [errorCompartir, setErrorCompartir] = useState('');

  async function cargar() {
    setCargando(true);
    setError(false);
    setLlegoAlFinal(false);
    try {
      // El cliente agrega el token solo (así la API deja descargar el PDF)
      const [pdf, c, yo] = await Promise.all([
        cliente.get<ArrayBuffer>(`/documents/${id}/download`, { responseType: 'arraybuffer' }),
        convenioId ? cliente.get<Convenio>(`/agreements/${convenioId}`) : Promise.resolve(null),
        cliente.get<{ user: { rol: string } }>('/auth/me'),
      ]);
      setHtml(armarHtml(aBase64(pdf.data)));
      setConvenio(c ? c.data : null);
      setRol(yo.data.user.rol);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [id]);

  // Descarga el PDF y abre el menú de compartir
  async function compartir() {
    if (compartiendo) return;
    setErrorCompartir('');
    setCompartiendo(true);
    try {
      await compartirDocumento(id, nombre ?? `documento-${id}.pdf`);
    } catch (e) {
      setErrorCompartir(e instanceof Error ? e.message : 'No se pudo compartir.');
    }
    setCompartiendo(false);
  }

  // Paso 1: al tocar Firmar. Revisa que se pueda y pide la huella.
  async function firmar() {
    if (firmando || !convenio) return;
    setMensaje('');

    if (rol !== 'administracion') {
      return setMensaje('Solo administración puede firmar convenios.');
    }
    if (convenio.estado !== 'aprobado') {
      return setMensaje('Solo se puede firmar un convenio aprobado.');
    }

    const hayHuella = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!hayHuella) {
      return setMensaje('Este dispositivo no tiene una huella registrada.');
    }

    const huella = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmá con tu huella para firmar',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true, // solo huella, sin el PIN del celular
    });
    if (!huella.success) {
      return setMensaje('No se pudo verificar la huella. Probá de nuevo.');
    }

    setPidiendoFirma(true); // sigue: el cuadro para firmar a mano
  }

  // Paso 2: ya dibujó la firma. Pide la ubicación (una vez) y manda todo a POST /sign.
  async function alTenerFirma(imagen: string) {
    setPidiendoFirma(false);
    if (!convenio) return;
    setFirmando(true);

    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') {
        setMensaje('Hace falta el permiso de ubicación para firmar.');
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({});

      const { data } = await cliente.post<ConvenioFirmado>(`/agreements/${convenio.id}/sign`, {
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        firma_imagen: imagen, // la firma dibujada a mano (PNG en base64)
      });
      setImagenFirma(imagen);
      setFirmado(data);
      actualizarRecordatorioFirma().catch(() => {}); // si ya no quedan convenios por firmar, se cancela el aviso
    } catch (e) {
      const delServidor = axios.isAxiosError(e) ? e.response?.data?.message : null;
      setMensaje(delServidor ?? 'No se pudo firmar. Probá de nuevo.');
    } finally {
      setFirmando(false);
    }
  }

  function contenido() {
    if (cargando) return <LoadingView mensaje="Descargando el documento…" />;
    if (error || !html) {
      return <ErrorView mensaje="No se pudo abrir el documento." onReintentar={cargar} />;
    }

    // Ya firmado: se muestran la fecha, la hora y el lugar
    if (firmado) {
      const iso = firmado.firma.fecha; // ej: 2026-11-17T11:30:12-03:00 (hora de Argentina)
      return (
        <ScrollView contentContainerStyle={styles.resultado}>
          <ThemedText type="subtitle">Convenio firmado</ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {firmado.codigo}
          </ThemedText>
          <ThemedText type="default" style={styles.titulo}>
            {firmado.titulo}
          </ThemedText>
          <View style={styles.insignia}>
            <Badge estado="firmado" />
          </View>

          <View style={[styles.caja, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Fila etiqueta="Fecha" valor={iso.slice(0, 10).split('-').reverse().join('/')} />
            <Fila etiqueta="Hora" valor={`${iso.slice(11, 19)} hs`} />
            <Fila etiqueta="Latitud" valor={String(firmado.firma.latitud)} />
            <Fila etiqueta="Longitud" valor={String(firmado.firma.longitud)} />
          </View>

          <View style={[styles.caja, { backgroundColor: '#ffffff', borderColor: theme.border }]}>
            <ThemedText type="small" style={styles.etiquetaFirma}>
              Firma a mano
            </ThemedText>
            <Image source={{ uri: imagenFirma }} style={styles.imagenFirma} resizeMode="contain" />
          </View>

          <Button titulo="Ver ficha" onPress={() => router.replace(`/convenio/${firmado.id}`)} />
        </ScrollView>
      );
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
          <View style={styles.botones}>
            <View style={styles.boton}>
              <Button titulo="← Volver" variante="secundario" onPress={() => router.back()} />
            </View>
            <View style={styles.boton}>
              <Button
                titulo={compartiendo ? 'Preparando…' : 'Compartir'}
                variante="secundario"
                onPress={compartir}
              />
            </View>
          </View>
          {errorCompartir !== '' && (
            <ThemedText type="small" themeColor="error">
              {errorCompartir}
            </ThemedText>
          )}
        </View>

        {contenido()}

        {/* Aparece recién al llegar al final del documento */}
        {llegoAlFinal && !firmado && (
          <View style={styles.barra}>
            {mensaje !== '' && (
              <ThemedText type="small" themeColor="error">
                {mensaje}
              </ThemedText>
            )}
            <Button titulo={firmando ? 'Firmando…' : 'Firmar'} onPress={firmar} />
          </View>
        )}
      </SafeAreaView>

      <FirmaManuscrita
        visible={pidiendoFirma}
        onConfirmar={alTenerFirma}
        onCancelar={() => setPidiendoFirma(false)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  barra: { padding: Spacing.three, gap: Spacing.two },
  botones: { flexDirection: 'row', gap: Spacing.two },
  boton: { flex: 1 },
  visor: { flex: 1 },
  resultado: { padding: Spacing.three, gap: Spacing.three },
  titulo: { fontWeight: '700' },
  insignia: { flexDirection: 'row' },
  caja: { gap: Spacing.two, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium },
  fila: { gap: Spacing.half },
  etiquetaFirma: { color: '#6B4A4E' },
  imagenFirma: { width: '100%', height: 120 },
});
