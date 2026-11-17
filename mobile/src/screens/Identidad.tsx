import axios from 'axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { FirmaManuscrita } from '@/components/organisms/FirmaManuscrita';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Registrar mi identidad: firma dibujada, foto de rostro y huella.
// Cada paso se manda a POST /me/identity y la API dice cuáles ya están registrados (GET /me/identity).

type Paso = { registrada: boolean; fecha: string | null };
type Estado = { firma: Paso; rostro: Paso; huella: Paso; completa: boolean };

// Una marca verde "Registrada" o el botón para registrar
function Caja({ titulo, texto, paso, children }: { titulo: string; texto: string; paso?: Paso; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.caja, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {texto}
      </ThemedText>
      {paso?.registrada && (
        <ThemedText themeColor="success">
          ✓ Registrada
          {paso.fecha ? ` el ${paso.fecha.slice(0, 10).split('-').reverse().join('/')}` : ''}
        </ThemedText>
      )}
      {children}
    </View>
  );
}

// El PNG de la firma llega como texto base64: se guarda en un archivo para poder subirlo
function archivoDeFirma(dataUrl: string) {
  const texto = atob(dataUrl.replace(/^data:image\/png;base64,/, ''));
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);

  const archivo = new File(Paths.cache, 'firma-identidad.png');
  archivo.create({ overwrite: true });
  archivo.write(bytes);
  return archivo.uri;
}

// Identificador propio de este celular: se crea una vez y se reutiliza (la API guarda solo su hash)
async function identificadorDelCelular() {
  let id = await SecureStore.getItemAsync('huella-id');
  if (!id) {
    id = `huella-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await SecureStore.setItemAsync('huella-id', id);
  }
  return id;
}

export default function Identidad() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [pidiendoFirma, setPidiendoFirma] = useState(false);
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const camara = useRef<CameraView>(null);
  const [permiso, pedirPermiso] = useCameraPermissions();

  useEffect(() => {
    async function cargar() {
      try {
        const { data } = await cliente.get<Estado>('/me/identity');
        setEstado(data);
      } catch {
        setMensaje('No se pudo cargar tu identidad.');
      }
    }
    cargar();
  }, []);

  // Manda un paso a la API y actualiza las marcas con lo que ella responde
  async function enviar(campo: 'firma' | 'rostro' | 'huella', valor: string) {
    setEnviando(true);
    setMensaje('');
    try {
      const formulario = new FormData();
      if (campo === 'huella') {
        formulario.append('huella', valor);
      } else {
        const esFirma = campo === 'firma';
        formulario.append(campo, {
          uri: valor,
          name: esFirma ? 'firma.png' : 'rostro.jpg',
          type: esFirma ? 'image/png' : 'image/jpeg',
        } as unknown as Blob);
      }
      const { data } = await cliente.post<Estado>('/me/identity', formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      setEstado(data);
    } catch (e) {
      const datos = axios.isAxiosError(e) ? e.response?.data : null;
      const primero = datos?.errors ? (Object.values(datos.errors)[0] as string[])[0] : null;
      setMensaje(primero ?? datos?.message ?? 'No se pudo registrar. Probá de nuevo.');
    }
    setEnviando(false);
  }

  async function alTenerFirma(dataUrl: string) {
    setPidiendoFirma(false);
    await enviar('firma', archivoDeFirma(dataUrl));
  }

  async function abrirCamara() {
    setMensaje('');
    if (!permiso?.granted && !(await pedirPermiso()).granted) {
      return setMensaje('Hace falta el permiso de la cámara para sacar la foto.');
    }
    setCamaraAbierta(true);
  }

  async function sacarFoto() {
    const foto = await camara.current?.takePictureAsync({ quality: 0.7 });
    setCamaraAbierta(false);
    if (foto) await enviar('rostro', foto.uri);
  }

  async function registrarHuella() {
    setMensaje('');
    const hayHuella = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!hayHuella) return setMensaje('Este dispositivo no tiene una huella registrada.');

    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmá tu huella para registrarla',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
    });
    if (!resultado.success) return setMensaje('No se pudo verificar la huella. Probá de nuevo.');

    await enviar('huella', await identificadorDelCelular());
  }

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <View style={styles.barra}>
          <Button titulo="← Volver" variante="secundario" onPress={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.contenido}>
          <ThemedText type="subtitle">Registrar mi identidad</ThemedText>
          {estado?.completa && <ThemedText themeColor="success">✓ Tu identidad está completa.</ThemedText>}

          <Caja titulo="1. Firma" texto="Dibujá tu firma con el dedo." paso={estado?.firma}>
            <Button
              titulo={estado?.firma.registrada ? 'Registrar de nuevo' : 'Dibujar firma'}
              variante="secundario"
              onPress={() => setPidiendoFirma(true)}
            />
          </Caja>

          <Caja titulo="2. Foto de rostro" texto="Sacate una foto de frente con la cámara." paso={estado?.rostro}>
            <Button
              titulo={estado?.rostro.registrada ? 'Sacar otra foto' : 'Sacar foto'}
              variante="secundario"
              onPress={abrirCamara}
            />
          </Caja>

          <Caja titulo="3. Huella" texto="Verificá tu huella con el sensor del celular." paso={estado?.huella}>
            <Button
              titulo={estado?.huella.registrada ? 'Verificar de nuevo' : 'Verificar huella'}
              variante="secundario"
              onPress={registrarHuella}
            />
          </Caja>

          {enviando && <ThemedText themeColor="textSecondary">Enviando…</ThemedText>}
          {mensaje !== '' && (
            <ThemedText type="small" themeColor="error">
              {mensaje}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>

      <FirmaManuscrita visible={pidiendoFirma} onConfirmar={alTenerFirma} onCancelar={() => setPidiendoFirma(false)} />

      <Modal visible={camaraAbierta} animationType="slide" onRequestClose={() => setCamaraAbierta(false)}>
        <ThemedView style={styles.contenedor}>
          <SafeAreaView style={styles.area}>
            <CameraView ref={camara} facing="front" style={styles.camara} />
            <View style={styles.contenido}>
              <Button titulo="Tomar foto" onPress={sacarFoto} />
              <Button titulo="Cancelar" variante="secundario" onPress={() => setCamaraAbierta(false)} />
            </View>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  barra: { padding: Spacing.three },
  contenido: { padding: Spacing.three, gap: Spacing.three },
  caja: { gap: Spacing.two, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium },
  camara: { flex: 1 },
});
