import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cliente } from '@/api/cliente';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, type EstadoConvenio } from '@/constants/theme';
import { textoDelTipo } from '@/constants/tipos';
import { useTheme } from '@/hooks/use-theme';

// Lo que usamos de las respuestas de la API
type Parte = {
  id: number;
  nombre: string;
  representante: string | null;
  cargo_representante: string | null;
  pivot: { rol_parte: string };
};

type Convenio = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: EstadoConvenio;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  unidad: { nombre: string; sigla: string };
  partes: Parte[];
};

type Documento = { id: number; tipo: string; nombre_original: string; version: number };
type Padre = { id: number; codigo: string; titulo: string };

// La API manda "2025-11-10"; se muestra "10/11/2025"
function fecha(f: string | null) {
  return f ? f.split('-').reverse().join('/') : 'Sin fecha';
}

// Cada bloque de la ficha: caja con título, siempre igual
function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.seccion, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {titulo}
      </ThemedText>
      {children}
    </View>
  );
}

// Un dato: etiqueta chica arriba y valor abajo
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText>{valor}</ThemedText>
    </View>
  );
}

export default function FichaConvenio() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(false);
    try {
      const [c, vinculos, docs] = await Promise.all([
        cliente.get(`/agreements/${id}`),
        cliente.get(`/agreements/${id}/links`),
        cliente.get(`/agreements/${id}/documents`),
      ]);
      setConvenio(c.data);
      setPadres(vinculos.data.antecedentes); // los convenios en los que este se apoya
      setDocumentos(docs.data.data);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [id]);

  function contenido() {
    if (cargando) return <LoadingView />;
    if (error || !convenio) {
      return <ErrorView mensaje="No se pudo cargar el convenio." onReintentar={cargar} />;
    }

    return (
      <ScrollView contentContainerStyle={styles.contenido}>
        <Button titulo="← Volver" variante="secundario" onPress={() => router.back()} />

        {/* Encabezado: lo primero que se ve */}
        <View style={styles.encabezado}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {convenio.codigo} · {textoDelTipo(convenio.tipo)}
          </ThemedText>
          <ThemedText type="subtitle">{convenio.titulo}</ThemedText>
          <View style={styles.estado}>
            <Badge estado={convenio.estado} />
          </View>
        </View>

        <Seccion titulo="Procedencia">
          <ThemedText>
            {convenio.unidad.nombre} ({convenio.unidad.sigla})
          </ThemedText>
        </Seccion>

        <Seccion titulo="Firmantes">
          {convenio.partes.length === 0 && (
            <ThemedText themeColor="textSecondary">Sin firmantes registrados.</ThemedText>
          )}
          {convenio.partes.map((p) => (
            <View key={p.id} style={styles.dato}>
              <ThemedText type="small" themeColor="textSecondary">
                {p.pivot.rol_parte}
              </ThemedText>
              <ThemedText>{p.nombre}</ThemedText>
              {p.representante && (
                <ThemedText type="small">
                  {p.representante}
                  {p.cargo_representante ? ` · ${p.cargo_representante}` : ''}
                </ThemedText>
              )}
            </View>
          ))}
        </Seccion>

        <Seccion titulo="Fechas">
          <Dato etiqueta="Firma" valor={fecha(convenio.fecha_firma)} />
          <Dato etiqueta="Inicio" valor={fecha(convenio.fecha_inicio)} />
          <Dato
            etiqueta="Vencimiento"
            valor={convenio.fecha_vencimiento ? fecha(convenio.fecha_vencimiento) : 'Sin vencimiento registrado'}
          />
        </Seccion>

        {padres.length > 0 && (
          <Seccion titulo="Convenio padre">
            {padres.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/convenio/${p.id}`)}
                accessibilityRole="link"
                accessibilityLabel={`Abrir ${p.codigo}`}>
                <ThemedText type="link">
                  {p.codigo} · {p.titulo}
                </ThemedText>
              </Pressable>
            ))}
          </Seccion>
        )}

        <Seccion titulo="Documentos">
          {documentos.length === 0 && <ThemedText themeColor="textSecondary">Sin documentos.</ThemedText>}
          {documentos.map((d) => (
            <View key={d.id} style={styles.dato}>
              <ThemedText>📄 {d.nombre_original}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {d.tipo} · versión {d.version}
              </ThemedText>
            </View>
          ))}
        </Seccion>
      </ScrollView>
    );
  }

  return (
    <ThemedView style={[styles.contenedor, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.area}>{contenido()}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  contenido: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  encabezado: { gap: Spacing.one },
  estado: { flexDirection: 'row', marginTop: Spacing.one },
  seccion: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  dato: { gap: Spacing.half },
});
