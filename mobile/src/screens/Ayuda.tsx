import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Tarjeta } from '@/components/atoms/Tarjeta';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MANUAL } from '@/constants/ayuda';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Manual de usuario: dos guías paso a paso (el contenido está en constants/ayuda.ts)
export default function Ayuda() {
  const theme = useTheme();

  return (
    <ThemedView conFondo style={styles.contenedor}>
      <SafeAreaView style={styles.contenedor}>
        <View style={styles.barra}>
          <Button titulo="Volver" variante="secundario" onPress={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.contenido}>
          <ThemedText type="subtitle">Ayuda</ThemedText>
          <ThemedText themeColor="textSecondary">Manual corto, paso a paso.</ThemedText>

          {MANUAL.map((guia) => (
            <View key={guia.titulo} style={styles.guia}>
              <ThemedText type="smallBold">{guia.titulo}</ThemedText>

              {guia.pasos.map((paso, i) => (
                <Tarjeta key={paso.texto} acento="#e86a04" style={styles.paso}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Paso {i + 1}
                  </ThemedText>
                  <ThemedText>{paso.texto}</ThemedText>
                  {paso.imagen && <Image source={paso.imagen} style={styles.captura} resizeMode="contain" />}
                </Tarjeta>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  barra: { padding: Spacing.three },
  contenido: { padding: Spacing.three, gap: Spacing.three },
  guia: { gap: Spacing.two },
  paso: { gap: Spacing.one, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.medium },
  captura: { width: '100%', height: 360, marginTop: Spacing.two },
});
