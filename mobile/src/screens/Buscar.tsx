import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { TituloConAyuda } from '@/components/molecules/TituloConAyuda';
import { AvisoSinConexion } from '@/components/molecules/AvisoSinConexion';
import { EmptyView } from '@/components/molecules/EmptyView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { Opciones } from '@/components/molecules/Opciones';
import { SearchBar } from '@/components/molecules/SearchBar';
import { ConvenioArbol } from '@/components/organisms/ConvenioArbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Estados, Radius, Spacing, type EstadoConvenio } from '@/constants/theme';
import { TIPOS } from '@/constants/tipos';
import { usePreferencias } from '@/context/preferencias';
import { useSinConexion } from '@/hooks/use-sin-conexion';
import { useTheme } from '@/hooks/use-theme';

type Convenio = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: EstadoConvenio;
};

type Unidad = { id: number; nombre: string; sigla: string };

const ESTADOS = (Object.keys(Estados) as EstadoConvenio[]).map((e) => ({
  valor: e,
  texto: Estados[e].label,
}));

export default function Buscar() {
  const theme = useTheme();
  const { escala } = usePreferencias();
  const sinConexion = useSinConexion();
  // Si se buscó desde el header de otra pantalla, el texto llega como parámetro
  const { q: qParam, unidad: unidadParam } = useLocalSearchParams<{ q?: string; unidad?: string }>();

  const [q, setQ] = useState(qParam ?? '');
  const [anio, setAnio] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  // Lo que se elige dentro de la ventana; recién al tocar "Aplicar" pasa a los filtros de arriba
  const [dAnio, setDAnio] = useState('');
  const [dTipo, setDTipo] = useState('');
  const [dEstado, setDEstado] = useState('');
  const [dUnidad, setDUnidad] = useState('');

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0); // sube cada vez que se toca Reintentar

  // El año solo se usa cuando tiene los 4 dígitos
  const anioValido = anio.length === 4 ? anio : '';

  // Cuántos filtros hay puestos (se muestra en el botón)
  const activos = [anioValido, tipo, estado, unidadId].filter(Boolean).length;

  useEffect(() => {
    setQ(qParam ?? '');
  }, [qParam]);

  // Acceso rápido desde Inicio: llega la unidad de la sede
  useEffect(() => {
    if (unidadParam) setUnidadId(unidadParam);
  }, [unidadParam]);

  // Las unidades para el filtro (si falla, simplemente no se muestran)
  useEffect(() => {
    cliente
      .get<Unidad[]>('/unidades')
      .then(({ data }) => setUnidades(data))
      .catch(() => {});
  }, []);

  // Cada vez que cambia el texto o un filtro, se vuelve a pedir la lista
  useEffect(() => {
    let vigente = true; // evita que una respuesta vieja pise a una más nueva
    setCargando(true);
    setError(false);

    cliente
      .get('/agreements', {
        params: {
          q: q || undefined,
          anio: anioValido || undefined,
          tipo: tipo || undefined,
          estado: estado || undefined,
          unidad_id: unidadId || undefined,
        },
      })
      .then(({ data }) => {
        if (!vigente) return;
        setConvenios(data.data);
        setTotal(data.meta.total);
        setCargando(false);
      })
      .catch(() => {
        if (!vigente) return;
        setError(true);
        setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [q, anioValido, tipo, estado, unidadId, intento]);

  function abrirFiltros() {
    setDAnio(anio);
    setDTipo(tipo);
    setDEstado(estado);
    setDUnidad(unidadId);
    setMostrarFiltros(true);
  }

  function aplicarFiltros() {
    setAnio(dAnio);
    setTipo(dTipo);
    setEstado(dEstado);
    setUnidadId(dUnidad);
    setMostrarFiltros(false);
  }

  function limpiarFiltros() {
    setDAnio('');
    setDTipo('');
    setDEstado('');
    setDUnidad('');
  }

  function resultados() {
    if (cargando) return <LoadingView />;
    if (error) {
      return <ErrorView mensaje="No se pudo buscar." onReintentar={() => setIntento(intento + 1)} />;
    }
    if (convenios.length === 0) {
      return <EmptyView titulo="Sin resultados" mensaje="Probá con otro texto o con otros filtros." />;
    }
    return (
      <>
        <ThemedText type="small" themeColor="textSecondary">
          Mostrando {convenios.length} de {total}
        </ThemedText>
        {convenios.map((c) => (
          <ConvenioArbol key={c.id} convenio={c} />
        ))}
      </>
    );
  }

  return (
    <ThemedView conFondo style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <TituloConAyuda titulo="Buscar" seccion="buscar" />
          {sinConexion ? (
            <AvisoSinConexion completo />
          ) : (
            <>
              {/* key: si llega un texto nuevo desde el header, la barra se arma de nuevo con ese texto */}
              <SearchBar key={qParam} valorInicial={qParam ?? ''} onBuscar={setQ} />

              <View style={styles.acciones}>
                <View style={styles.accion}>
                  <Button
                    titulo={activos > 0 ? `Filtros (${activos})` : 'Filtros'}
                    variante="secundario"
                    onPress={abrirFiltros}
                  />
                </View>
                <View style={styles.accion}>
                  <Button titulo="Escanear QR" variante="secundario" onPress={() => router.push('/qr')} />
                </View>
              </View>

              {resultados()}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={mostrarFiltros} animationType="slide" onRequestClose={() => setMostrarFiltros(false)}>
        <ThemedView style={styles.contenedor}>
          <SafeAreaView style={styles.area}>
            <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
              <ThemedText type="subtitle">Filtros</ThemedText>

              <View style={styles.grupo}>
                <ThemedText type="smallBold">Año</ThemedText>
                <TextInput
                  value={dAnio}
                  onChangeText={setDAnio}
                  placeholder="Ej: 2025"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  accessibilityLabel="Año"
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                      fontSize: 16 * escala,
                    },
                  ]}
                />
              </View>

              <Opciones titulo="Tipo" opciones={TIPOS} valor={dTipo} onElegir={setDTipo} />
              <Opciones titulo="Estado" opciones={ESTADOS} valor={dEstado} onElegir={setDEstado} />
              <Opciones
                titulo="Unidad"
                opciones={unidades.map((u) => ({ valor: String(u.id), texto: u.sigla }))}
                valor={dUnidad}
                onElegir={setDUnidad}
              />

              <Button titulo="Aplicar" onPress={aplicarFiltros} />
              <Button titulo="Limpiar" variante="secundario" onPress={limpiarFiltros} />
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </Modal>
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
  acciones: { flexDirection: 'row', gap: Spacing.two },
  accion: { flex: 1 },
  grupo: { gap: Spacing.two },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 16,
  },
});
