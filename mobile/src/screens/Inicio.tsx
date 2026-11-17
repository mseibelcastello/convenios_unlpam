import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cliente } from '@/api/cliente';
import { LoadingView } from '@/components/atoms/LoadingView';
import { EmptyView } from '@/components/molecules/EmptyView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { TituloConAyuda } from '@/components/molecules/TituloConAyuda';
import { MiSede } from '@/components/organisms/MiSede';
import { HeaderBuscador } from '@/components/organisms/HeaderBuscador';
import { Button } from '@/components/atoms/Button';
import { Tarjeta } from '@/components/atoms/Tarjeta';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Lo que usamos de la respuesta de GET /dashboard
type Movimiento = {
  convenio_id: number;
  fecha: string;
  accion: string;
  usuario: string;
  codigo: string;
  titulo: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  documento_tipo: string | null;
};

type Dashboard = {
  por_estado: { borrador: number; revision: number; aprobado: number };
  firmados: { vigentes: number };
  firmados_ultimo_anio: { total: number };
  ultimos_movimientos: Movimiento[];
};

// Texto corto de cada movimiento
function describir(m: Movimiento) {
  if (m.accion === 'subir') return `${m.usuario} subió un documento (${m.documento_tipo})`;
  return `${m.usuario} pasó de ${m.estado_anterior} a ${m.estado_nuevo}`;
}

export default function Inicio() {
  const theme = useTheme();
  const [datos, setDatos] = useState<Dashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(false);
    try {
      const { data } = await cliente.get<Dashboard>('/dashboard');
      setDatos(data);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  // Al principio se ven solo los 3 últimos movimientos
  const [verTodos, setVerTodos] = useState(false);

  function contenido() {
    if (cargando) return <LoadingView />;
    if (error || !datos) {
      return <ErrorView mensaje="No se pudo cargar el resumen." onReintentar={cargar} />;
    }

    // Las cuatro cajas
    const cajas = [
      { titulo: 'Firmados en el último año', numero: datos.firmados_ultimo_anio.total },
      { titulo: 'Vigentes', numero: datos.firmados.vigentes },
      { titulo: 'En trámite', numero: datos.por_estado.borrador + datos.por_estado.revision },
      { titulo: 'Mis pendientes', numero: datos.por_estado.aprobado },
    ];

    return (
      <ScrollView contentContainerStyle={styles.contenido}>
        <TituloConAyuda titulo="Inicio" seccion="inicio" />

        <MiSede />

        <View style={styles.cajas}>
          {cajas.map((c) => (
            <Tarjeta key={c.titulo} acento="#e86a04" style={styles.caja}>
              <ThemedText type="subtitle">{c.numero}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {c.titulo}
              </ThemedText>
            </Tarjeta>
          ))}
        </View>

        <ThemedText type="smallBold">Últimos movimientos</ThemedText>
        {datos.ultimos_movimientos.length === 0 ? (
          <EmptyView titulo="Sin movimientos" mensaje="Todavía no hay movimientos para mostrar." />
        ) : (
          // El backend ya manda máximo 10, del más reciente al más antiguo
          datos.ultimos_movimientos.slice(0, verTodos ? 10 : 3).map((m, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(`/convenio/${m.convenio_id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${m.codigo}`}
            >
              <Tarjeta acento="#e86a04" style={styles.movimiento}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {m.codigo} · {m.titulo}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {new Date(m.fecha).toLocaleDateString('es-AR')} · {describir(m)}
                </ThemedText>
              </Tarjeta>
            </Pressable>
          ))
        )}
        {datos.ultimos_movimientos.length > 3 && (
          <Button
            titulo={verTodos ? 'Ver menos' : 'Ver más movimientos'}
            variante="secundario"
            onPress={() => setVerTodos(!verTodos)}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ThemedView conFondo style={styles.contenedor}>
      {/* SafeAreaView evita que el contenido quede tapado por las barras */}
      <SafeAreaView style={styles.area}>
        <HeaderBuscador />
        {contenido()}
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
  cajas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  caja: {
    width: '48%',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingLeft: Spacing.three + 4,
    paddingRight: Spacing.three,
  },
  movimiento: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
});
