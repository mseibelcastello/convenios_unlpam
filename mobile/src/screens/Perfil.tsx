import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cerrarSesion } from '@/api/auth';
import { borrarPin } from '@/api/bloqueo';
import { borrarPorFirmar } from '@/api/porFirmarLocal';
import { cancelarRecordatorios, probarNotificaciones } from '@/api/recordatorios';
import { Button } from '@/components/atoms/Button';
import { Opciones } from '@/components/molecules/Opciones';
import { BloqueoPerfil } from '@/components/organisms/BloqueoPerfil';
import { HeaderBuscador } from '@/components/organisms/HeaderBuscador';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing, type TamanoLetra } from '@/constants/theme';
import { type Modo, usePreferencias } from '@/context/preferencias';
import { useTheme } from '@/hooks/use-theme';

const TAMANOS = [
  { valor: 'chica', texto: 'Chica' },
  { valor: 'mediana', texto: 'Mediana' },
  { valor: 'grande', texto: 'Grande' },
];

const MODOS = [
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
];

// Cada opción de Mi Perfil: caja con título
function Caja({ titulo, children }: { titulo: string; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.caja, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {titulo}
      </ThemedText>
      {children}
    </View>
  );
}

export default function Perfil() {
  const theme = useTheme();
  const { modo, tamano, miniatura, guardar, subirFoto } = usePreferencias();
  const [mensaje, setMensaje] = useState('');
  const [mensajeEsError, setMensajeEsError] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  function avisar(texto: string, esError: boolean) {
    setMensaje(texto);
    setMensajeEsError(esError);
  }

  // El cambio se ve en el momento; si la API no responde, queda igual en este celular
  async function cambiar(nuevoModo: Modo, nuevoTamano: TamanoLetra) {
    avisar('', false);
    try {
      await guardar(nuevoModo, nuevoTamano);
    } catch {
      avisar('Se aplicó en este celular, pero no se pudo guardar en el servidor.', true);
    }
  }

  async function elegirFoto() {
    if (subiendo) return;
    avisar('', false);

    const elegida = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // deja recortar
      aspect: [1, 1], // cuadrada
      quality: 0.8,
    });
    if (elegida.canceled) return;

    setSubiendo(true);
    try {
      await subirFoto(elegida.assets[0]);
      avisar('Foto actualizada.', false);
    } catch (e) {
      const datos = axios.isAxiosError(e) ? e.response?.data : null;
      avisar(datos?.errors?.foto?.[0] ?? datos?.message ?? 'No se pudo subir la foto.', true);
    }
    setSubiendo(false);
  }

  async function salir() {
    await borrarPin().catch(() => {}); // el PIN es de esta sesión: otra persona no lo hereda
    await cancelarRecordatorios().catch(() => {});
    await borrarPorFirmar().catch(() => {}); // no queda nada de la persona en el teléfono
    await cerrarSesion();
    router.replace('/login');
  }

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <HeaderBuscador />
        <ScrollView contentContainerStyle={styles.contenido}>
          <ThemedText type="subtitle">Perfil</ThemedText>

          <Caja titulo="Tamaño de letra">
            <Opciones
              titulo=""
              opciones={TAMANOS}
              valor={tamano}
              onElegir={(valor) => valor && cambiar(modo, valor as TamanoLetra)}
            />
          </Caja>

          <Caja titulo="Modo">
            <Opciones
              titulo=""
              opciones={MODOS}
              valor={modo}
              onElegir={(valor) => valor && cambiar(valor as Modo, tamano)}
            />
          </Caja>

          <Caja titulo="Foto de perfil">
            <View style={styles.fotoFila}>
              {miniatura ? (
                <Image source={{ uri: miniatura }} style={styles.foto} />
              ) : (
                <View style={[styles.foto, styles.sinFoto, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Sin foto
                  </ThemedText>
                </View>
              )}
              <View style={styles.fotoBoton}>
                <Button
                  titulo={subiendo ? 'Subiendo…' : 'Elegir foto'}
                  variante="secundario"
                  onPress={elegirFoto}
                />
              </View>
            </View>
          </Caja>

          <BloqueoPerfil />

          {mensaje !== '' && (
            <ThemedText type="small" themeColor={mensajeEsError ? 'error' : 'success'}>
              {mensaje}
            </ThemedText>
          )}

          <Button titulo="Probar notificaciones (prueba)" variante="secundario" onPress={async () => avisar(await probarNotificaciones(), false)} />
          <Button titulo="Registrar mi identidad" variante="secundario" onPress={() => router.push('/identidad')} />
          <Button titulo="Ver pantallas de estado (prueba)" variante="secundario" onPress={() => router.push('/estados')} />
          <Button titulo="Cerrar sesión" variante="secundario" onPress={salir} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  contenido: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  caja: { gap: Spacing.two, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium },
  fotoFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fotoBoton: { flex: 1 },
  foto: { width: 80, height: 80, borderRadius: 40 },
  sinFoto: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
