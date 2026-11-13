import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { enviarCodigoPorMail, verificarMfa } from '@/api/auth';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function Codigo() {
  const theme = useTheme();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviandoMail, setEnviandoMail] = useState(false);

  // Pide que el servidor mande el código al correo
  async function mandarPorMail() {
    if (enviandoMail) return;
    setError(null);
    setAviso(null);
    setEnviandoMail(true);
    try {
      await enviarCodigoPorMail();
      setAviso('Te enviamos un código por mail. Ingresalo arriba.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado');
    } finally {
      setEnviandoMail(false);
    }
  }

  async function verificar() {
    if (cargando) return;
    if (codigo.length !== 6) {
      setError('El código tiene 6 dígitos');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      await verificarMfa(codigo);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado');
    } finally {
      setCargando(false);
    }
  }

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Verificá tu identidad</ThemedText>
          <ThemedText themeColor="textSecondary">
            Ingresá el código de 6 dígitos de Google Authenticator. Si todavía no lo activaste, activalo
            desde la web o pedí el código por mail.
          </ThemedText>

          <TextInput
            value={codigo}
            onChangeText={(texto) => setCodigo(texto.replace(/\D/g, ''))}
            placeholder="000000"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Código de verificación"
            keyboardType="number-pad"
            maxLength={6}
            onSubmitEditing={verificar}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          />

          {error && (
            <View
              accessibilityRole="alert"
              style={[
                styles.error,
                { backgroundColor: theme.errorBackground, borderColor: theme.error },
              ]}>
              <ThemedText type="small" themeColor="error">
                {error}
              </ThemedText>
            </View>
          )}

          {aviso && <ThemedText type="small">{aviso}</ThemedText>}

          <Button titulo={cargando ? 'Verificando…' : 'Verificar'} onPress={verificar} />
          <Button
            titulo={enviandoMail ? 'Enviando…' : 'Enviarme el código a mi mail'}
            variante="secundario"
            onPress={mandarPorMail}
          />
          <Button titulo="Volver" variante="secundario" onPress={() => router.back()} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  contenido: {
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
    flexGrow: 1,
  },
  input: {
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
});
