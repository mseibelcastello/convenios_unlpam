import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { cliente } from '@/api/cliente';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type EstadoConvenio } from '@/constants/theme';
import { textoDelTipo } from '@/constants/tipos';
import { useTheme } from '@/hooks/use-theme';

// Un convenio que se puede expandir. Al abrirlo pide sus hijos (GET /links) y sus documentos
// (GET /documents), y solo la primera vez. Cada hijo es otro ConvenioArbol, así que
// el marco → específico → adenda se despliega nivel por nivel.

type ConvenioArbolProps = {
  convenio: { id: number; codigo: string; titulo: string; tipo: string; estado: EstadoConvenio };
};

type Hijo = ConvenioArbolProps['convenio'];
type Documento = { id: number; tipo: string; nombre_original: string; version: number };

export function ConvenioArbol({ convenio }: ConvenioArbolProps) {
  const theme = useTheme();
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);

  async function cargar() {
    setCargando(true);
    setError(false);
    try {
      const [vinculos, docs] = await Promise.all([
        cliente.get(`/agreements/${convenio.id}/links`),
        cliente.get(`/agreements/${convenio.id}/documents`),
      ]);
      setHijos(vinculos.data.derivados); // los que se apoyan en este: específicos, adendas, renovaciones
      setDocumentos(docs.data.data);
      setCargado(true);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  function tocar() {
    setAbierto(!abierto);
    if (!abierto && !cargado) cargar();
  }

  const resoluciones = documentos.filter((d) => d.tipo === 'resolucion');
  const otros = documentos.filter((d) => d.tipo !== 'resolucion');

  function contenido() {
    if (cargando) return <ThemedText type="small" themeColor="textSecondary">Cargando…</ThemedText>;
    if (error) {
      return (
        <>
          <ThemedText type="small" themeColor="error">No se pudo cargar.</ThemedText>
          <Button titulo="Reintentar" variante="secundario" onPress={cargar} />
        </>
      );
    }
    if (hijos.length === 0 && documentos.length === 0) {
      return <ThemedText type="small" themeColor="textSecondary">Sin convenios derivados ni documentos.</ThemedText>;
    }
    return (
      <>
        {hijos.length > 0 && <ThemedText type="smallBold">Convenios derivados</ThemedText>}
        {hijos.map((h) => (
          <ConvenioArbol key={h.id} convenio={h} />
        ))}

        <ThemedText type="smallBold">Resoluciones</ThemedText>
        {resoluciones.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">Sin resoluciones.</ThemedText>
        )}
        {resoluciones.map((d) => (
          <ThemedText key={d.id} type="small">
            📄 {d.nombre_original} (v{d.version})
          </ThemedText>
        ))}

        <ThemedText type="smallBold">Documentos</ThemedText>
        {otros.length === 0 && <ThemedText type="small" themeColor="textSecondary">Sin documentos.</ThemedText>}
        {otros.map((d) => (
          <ThemedText key={d.id} type="small">
            📄 {d.nombre_original} · {d.tipo} (v{d.version})
          </ThemedText>
        ))}
      </>
    );
  }

  return (
    <View style={[styles.nodo, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable
        onPress={tocar}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`${convenio.codigo} ${convenio.titulo}`}
        style={styles.cabecera}>
        <ThemedText type="smallBold">{abierto ? '▼' : '▶'}</ThemedText>
        <View style={styles.datos}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {convenio.codigo} · {textoDelTipo(convenio.tipo)}
          </ThemedText>
          <ThemedText type="default" style={styles.titulo}>
            {convenio.titulo}
          </ThemedText>
          <View style={styles.estado}>
            <Badge estado={convenio.estado} />
          </View>
        </View>
      </Pressable>

      {abierto && (
        <View style={styles.cuerpo}>
          <Button titulo="Ver ficha" onPress={() => router.push(`/convenio/${convenio.id}`)} />
          {contenido()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nodo: { borderWidth: 1, borderRadius: Radius.medium },
  cabecera: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  datos: { flex: 1, gap: Spacing.one },
  titulo: { fontWeight: '700' },
  estado: { flexDirection: 'row' },
  cuerpo: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
});
