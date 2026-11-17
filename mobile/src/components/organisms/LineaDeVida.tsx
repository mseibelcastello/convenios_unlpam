import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { textoDelTipo } from '@/constants/tipos';
import { useTheme } from '@/hooks/use-theme';

// Línea de vida: toda la cadena de convenios a la que pertenece este (marco, renovaciones, específicos, adendas),
// en orden por fecha. La arma la API (GET /agreements/{id}/lifeline).

type Tramo = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: string;
  unidad: string | null;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  situacion: string;
  dias_para_vencer: number | null;
  es_el_consultado: boolean;
};

// Cómo se ve cada situación: texto y color del punto
const SITUACIONES: Record<string, { texto: string; color: string }> = {
  vigente: { texto: 'Vigente', color: '#2e7d32' },
  proximo_a_vencer: { texto: 'Próximo a vencer', color: '#ed6c02' },
  vencido: { texto: 'Vencido', color: '#d32f2f' },
  en_tramite: { texto: 'En trámite', color: '#757575' },
  rescindido: { texto: 'Rescindido', color: '#757575' },
  archivado: { texto: 'Archivado', color: '#757575' },
};

const fecha = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

export function LineaDeVida({ convenioId }: { convenioId: number }) {
  const theme = useTheme();
  const [tramos, setTramos] = useState<Tramo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(false);
    try {
      const { data } = await cliente.get(`/agreements/${convenioId}/lifeline`);
      setTramos(data.tramos);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, [convenioId]);

  if (cargando) return <ThemedText themeColor="textSecondary">Cargando la línea de vida…</ThemedText>;
  if (error) {
    return (
      <>
        <ThemedText type="small" themeColor="error">
          No se pudo cargar la línea de vida.
        </ThemedText>
        <Button titulo="Reintentar" variante="secundario" onPress={cargar} />
      </>
    );
  }
  if (tramos.length === 0) return <ThemedText themeColor="textSecondary">Sin línea de vida.</ThemedText>;

  return (
    <View>
      {tramos.map((t, i) => {
        const situacion = SITUACIONES[t.situacion] ?? { texto: t.situacion, color: '#757575' };
        const inicio = t.fecha_inicio ?? t.fecha_firma;

        return (
          <View key={t.id} style={styles.fila}>
            {/* La columna de la izquierda: el punto y la línea que baja hasta el siguiente */}
            <View style={styles.columna}>
              <View style={[styles.punto, { backgroundColor: situacion.color }]} />
              {i < tramos.length - 1 && <View style={[styles.linea, { backgroundColor: theme.border }]} />}
            </View>

            <Pressable
              // El convenio que se está viendo no se abre de nuevo
              disabled={t.es_el_consultado}
              onPress={() => router.push(`/convenio/${t.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${t.codigo}`}
              style={[
                styles.tramo,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: t.es_el_consultado ? situacion.color : theme.border,
                  borderWidth: t.es_el_consultado ? 2 : 1,
                },
              ]}>
              <ThemedText type="smallBold">
                {t.codigo}
                {t.es_el_consultado ? '  (este convenio)' : ''}
              </ThemedText>
              <ThemedText type="small">{t.titulo}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {textoDelTipo(t.tipo)}
                {t.unidad ? ` · ${t.unidad}` : ''}
              </ThemedText>
              <ThemedText type="small" style={{ color: situacion.color }}>
                {situacion.texto}
                {t.dias_para_vencer !== null && t.situacion !== 'en_tramite'
                  ? t.dias_para_vencer < 0
                    ? ` · venció hace ${-t.dias_para_vencer} días`
                    : ` · vence en ${t.dias_para_vencer} días`
                  : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {inicio ? `Desde ${fecha(inicio)}` : 'Sin fechas todavía'}
                {t.fecha_vencimiento ? ` · hasta ${fecha(t.fecha_vencimiento)}` : ''}
              </ThemedText>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.two },
  columna: { width: 16, alignItems: 'center' },
  punto: { width: 14, height: 14, borderRadius: 7, marginTop: Spacing.three },
  linea: { width: 2, flex: 1 },
  tramo: { flex: 1, gap: Spacing.half, padding: Spacing.three, borderRadius: Radius.medium, marginBottom: Spacing.two },
});
