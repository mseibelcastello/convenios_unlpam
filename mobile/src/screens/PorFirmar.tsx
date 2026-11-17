import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Tarjeta } from '@/components/atoms/Tarjeta';
import { leerPorFirmar, traerYGuardarPorFirmar, type PorFirmar as Pendiente } from '@/api/porFirmarLocal';
import { LoadingView } from '@/components/atoms/LoadingView';
import { TituloConAyuda } from '@/components/molecules/TituloConAyuda';
import { EmptyView } from '@/components/molecules/EmptyView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { HeaderBuscador } from '@/components/organisms/HeaderBuscador';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { textoDelTipo } from '@/constants/tipos';
import { useSinConexion } from '@/hooks/use-sin-conexion';
import { useTheme } from '@/hooks/use-theme';

// Convenios aprobados que esperan la firma. Con conexión se piden a la API y se guardan en el teléfono;
// sin conexión se muestran los que se guardaron la última vez.
export default function PorFirmar() {
  const theme = useTheme();
  const sinConexion = useSinConexion();
  const [lista, setLista] = useState<Pendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(false);
    try {
      setLista(await traerYGuardarPorFirmar());
    } catch {
      // Sin red (o la API no responde): se muestra la copia guardada en el teléfono
      try {
        setLista(await leerPorFirmar());
      } catch {
        setError(true);
      }
    }
    setCargando(false);
  }

  // Al abrir la pantalla, y de nuevo al recuperar la conexión
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [sinConexion]),
  );

  function contenido() {
    if (cargando) return <LoadingView />;
    if (error)
      return <ErrorView mensaje="No se pudieron cargar los convenios por firmar." onReintentar={cargar} />;
    if (lista.length === 0) {
      return <EmptyView titulo="Nada por firmar" mensaje="No hay convenios aprobados esperando la firma." />;
    }

    return lista.map((c) => (
      <Pressable
        key={c.id}
        // Sin conexión la ficha no se puede abrir: solo se ve el pendiente
        disabled={sinConexion}
        onPress={() => router.push(`/convenio/${c.id}`)}
        accessibilityRole="button"
      >
        <Tarjeta acento="#e86a04" style={styles.tarjeta}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {c.codigo}
          </ThemedText>
          <ThemedText type="smallBold">{c.titulo}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {textoDelTipo(c.tipo)}
            {c.unidad ? ` · ${c.unidad.sigla}` : ''}
            {c.fecha_vencimiento ? ` · vence ${c.fecha_vencimiento.split('-').reverse().join('/')}` : ''}
          </ThemedText>
        </Tarjeta>
      </Pressable>
    ));
  }

  return (
    <ThemedView conFondo style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <HeaderBuscador />
        <ScrollView contentContainerStyle={styles.contenido}>
          <TituloConAyuda titulo="Por firmar" seccion="porFirmar" />
          {contenido()}
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
  tarjeta: { gap: Spacing.one, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium },
});
