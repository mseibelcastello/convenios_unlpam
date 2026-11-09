import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login } from '@/api/auth';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function Login() {
  const theme = useTheme();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    if (cargando) return;
    if (!correo.trim() || !clave) {
      setError('Completá el correo y la clave');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const { mfa_required } = await login(correo.trim(), clave);
      if (mfa_required) {
        router.push('/codigo');
      } else {
        router.replace('/');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado');
    } finally {
      setCargando(false);
    }
  }

  const estiloInput = {
    color: theme.text,
    backgroundColor: theme.backgroundElement,
    borderColor: theme.border,
  };

  return (
    <ThemedView style={styles.contenedor}>
      <SafeAreaView style={styles.area}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Iniciar sesión</ThemedText>
          <ThemedText themeColor="textSecondary">Convenios UNLPam</ThemedText>

          <TextInput
            value={correo}
            onChangeText={setCorreo}
            placeholder="Correo"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Correo"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={[styles.input, estiloInput]}
          />
          <TextInput
            value={clave}
            onChangeText={setClave}
            placeholder="Clave"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Clave"
            secureTextEntry
            onSubmitEditing={ingresar}
            style={[styles.input, estiloInput]}
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

          <Button titulo={cargando ? 'Ingresando…' : 'Ingresar'} onPress={ingresar} />
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
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 16,
  },
  error: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
});