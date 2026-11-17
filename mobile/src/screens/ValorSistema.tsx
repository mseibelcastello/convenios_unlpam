import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Tarjeta } from '@/components/atoms/Tarjeta';
import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// SUPUESTOS: números inventados para la demo. No son mediciones reales.
const MINUTOS_SIN_SISTEMA = 90; // trámite en papel: imprimir, trasladar, buscar firmas, archivar
const MINUTOS_CON_SISTEMA = 30; // el mismo trámite en el sistema
const COSTO_HORA = 4000; // pesos por hora de trabajo administrativo (ficticio)

const SUPUESTOS = [
  `Un convenio tarda ${MINUTOS_SIN_SISTEMA} minutos de trabajo en papel (imprimir, trasladar, juntar firmas, archivar).`,
  `Con el sistema, el mismo trámite tarda ${MINUTOS_CON_SISTEMA} minutos.`,
  `Una hora de trabajo administrativo vale $${COSTO_HORA.toLocaleString('es-AR')} (valor ficticio).`,
  'La cantidad de convenios es la real del sistema: los convenios del año en curso que podés ver.',
];

export default function ValorSistema() {
  const theme = useTheme();
  const anio = new Date().getFullYear();
  const [cantidad, setCantidad] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(false);
    try {
      const { data } = await cliente.get('/agreements', { params: { anio } });
      setCantidad(data.meta.total);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function contenido() {
    if (cargando) return <LoadingView />;
    if (error || cantidad === null) {
      return <ErrorView mensaje="No se pudo contar los convenios del año." onReintentar={cargar} />;
    }

    const ahorroPorConvenio = MINUTOS_SIN_SISTEMA - MINUTOS_CON_SISTEMA;
    const minutos = ahorroPorConvenio * cantidad;
    const horas = minutos / 60;
    const pesos = horas * COSTO_HORA;
    const numero = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

    return (
      <ScrollView contentContainerStyle={styles.contenido}>
        <ThemedText type="subtitle">Qué ahorra este sistema</ThemedText>

        <Tarjeta acento="#e86a04" style={styles.caja}>
          <ThemedText type="small" themeColor="textSecondary">
            Ahorro estimado en {anio}
          </ThemedText>
          <ThemedText type="subtitle">{numero(horas)} horas</ThemedText>
          <ThemedText themeColor="textSecondary">≈ ${numero(pesos)} de trabajo administrativo (ficticio)</ThemedText>
        </Tarjeta>

        <ThemedText type="smallBold">El cálculo</ThemedText>
        <Tarjeta acento="#e86a04" style={styles.caja}>
          <ThemedText>
            {MINUTOS_SIN_SISTEMA} − {MINUTOS_CON_SISTEMA} = {ahorroPorConvenio} minutos ahorrados por convenio
          </ThemedText>
          <ThemedText>
            {ahorroPorConvenio} min × {cantidad} convenios = {numero(minutos)} minutos
          </ThemedText>
          <ThemedText>
            {numero(minutos)} min ÷ 60 = {numero(horas)} horas
          </ThemedText>
          <ThemedText>
            {numero(horas)} h × ${COSTO_HORA.toLocaleString('es-AR')} = ${numero(pesos)}
          </ThemedText>
        </Tarjeta>

        <ThemedText type="smallBold">Supuestos usados</ThemedText>
        {SUPUESTOS.map((s) => (
          <ThemedText key={s} type="small">
            • {s}
          </ThemedText>
        ))}

        <Tarjeta acento="#e86a04" style={styles.caja}>
          <ThemedText type="smallBold">Aclaración</ThemedText>
          <ThemedText type="small">
            Este sistema no cobra nada a nadie: no hay cobros, precios ni pagos reales. Los valores son ejemplos
            inventados para mostrar cómo se calcularía el ahorro.
          </ThemedText>
        </Tarjeta>
      </ScrollView>
    );
  }

  return (
    <ThemedView conFondo style={styles.contenedor}>
      <SafeAreaView style={styles.contenedor}>
        <View style={styles.barra}>
          <Button titulo="Volver" variante="secundario" onPress={() => router.back()} />
        </View>
        {contenido()}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  barra: { padding: Spacing.three },
  contenido: { padding: Spacing.three, gap: Spacing.three },
  caja: { gap: Spacing.two, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium },
});
