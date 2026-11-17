import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Lista de avisos de la persona (GET /alerts). Al tocar uno se marca leído y se abre la ficha del convenio.

type Aviso = {
  id: number;
  tipo: string;
  texto: string;
  leida: boolean;
  fecha: string;
  convenio: { id: number; codigo: string; titulo: string } | null;
};

export default function Alertas() {
  const theme = useTheme();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // La API entrega los avisos de a 20: la página 1 reemplaza la lista, las siguientes se agregan
  async function cargar(numero: number) {
    setCargando(true);
    setError(false);
    try {
      const { data } = await cliente.get('/alerts', { params: { page: numero } });
      setAvisos((anteriores) => (numero === 1 ? data.data : [...anteriores, ...data.data]));
      setPagina(data.meta.page);
      setUltimaPagina(data.meta.last_page);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  // Cada vez que se vuelve a la pantalla (por ejemplo desde la ficha) la lista se actualiza
  useFocusEffect(
    useCallback(() => {
      cargar(1);
    }, []),
  );

  async function abrir(aviso: Aviso) {
    setMensaje('');
    try {
      await cliente.post(`/alerts/${aviso.id}/read`);
    } catch {
      setMensaje('No se pudo marcar el aviso como leído.');
    }
    if (aviso.convenio) router.push(`/convenio/${aviso.convenio.id}`);
    else setMensaje('Este aviso no tiene un convenio asociado.');
  }

  function contenido() {
    if (cargando && avisos.length === 0) return <LoadingView />;
    if (error) return <ErrorView mensaje="No se pudieron cargar las alertas." onReintentar={() => cargar(1)} />;

    return (
      <ScrollView contentContainerStyle={styles.contenido}>
        <ThemedText type="subtitle">Alertas</ThemedText>
        {mensaje !== '' && (
          <ThemedText type="small" themeColor="error">
            {mensaje}
          </ThemedText>
        )}
        {avisos.length === 0 && <ThemedText themeColor="textSecondary">No tenés alertas.</ThemedText>}

        {avisos.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => abrir(a)}
            accessibilityRole="button"
            style={[
              styles.aviso,
              { backgroundColor: a.leida ? theme.background : theme.backgroundElement, borderColor: theme.border },
            ]}>
            <View style={styles.cabecera}>
              {!a.leida && <View style={styles.punto} />}
              <ThemedText type={a.leida ? 'small' : 'smallBold'} themeColor="textSecondary">
                {a.convenio?.codigo ?? 'Aviso'} · {new Date(a.fecha).toLocaleString('es-AR')}
              </ThemedText>
            </View>
            <ThemedText type={a.leida ? 'default' : 'smallBold'}>{a.texto}</ThemedText>
          </Pressable>
        ))}

        {pagina < ultimaPagina && (
          <Button titulo="Ver más alertas" variante="secundario" onPress={() => cargar(pagina + 1)} />
        )}
      </ScrollView>
    );
  }

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <View style={styles.barra}>
          <Button titulo="← Volver" variante="secundario" onPress={() => router.back()} />
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
  contenido: { padding: Spacing.three, gap: Spacing.two },
  aviso: { gap: Spacing.one, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d33' },
});
