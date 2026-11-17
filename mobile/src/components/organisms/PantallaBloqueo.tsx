import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pinConfigurado, reiniciarIntentos, verificarClave, verificarPin } from '@/api/bloqueo';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { usePreferencias } from '@/context/preferencias';
import { useTheme } from '@/hooks/use-theme';

// Pantalla de bloqueo. Tres formas de entrar: PIN de 4 dígitos, huella o la contraseña de la cuenta.
export function PantallaBloqueo({ visible, onDesbloquear }: { visible: boolean; onDesbloquear: () => void }) {
  const theme = useTheme();
  const { escala } = usePreferencias();
  const [hayPin, setHayPin] = useState(false);
  const [hayHuella, setHayHuella] = useState(false);
  const [usarClave, setUsarClave] = useState(false);
  const [pin, setPin] = useState('');
  const [clave, setClave] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  // Cada vez que aparece el bloqueo: se ve qué mecanismos hay y se ofrece la huella enseguida
  useEffect(() => {
    if (!visible) return;
    setPin('');
    setClave('');
    setMensaje('');
    setUsarClave(false);

    async function preparar() {
      setHayPin(await pinConfigurado());
      const huella =
        (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
      setHayHuella(huella);
      if (huella) usarHuella();
    }
    preparar();
  }, [visible]);

  async function entrar() {
    await reiniciarIntentos();
    onDesbloquear();
  }

  async function usarHuella() {
    const resultado = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloqueá Convenios UNLPam',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true, // solo huella, sin el PIN del celular
    });
    if (resultado.success) await entrar();
  }

  async function probarPin() {
    if (pin.length !== 4 || trabajando) return;
    setTrabajando(true);
    const resultado = await verificarPin(pin);
    setPin('');
    setTrabajando(false);

    if (resultado === 'ok') return onDesbloquear();
    if (resultado === 'agotado') {
      return setMensaje('Demasiados intentos con el PIN. Usá la huella o tu contraseña.');
    }
    setMensaje('PIN incorrecto.');
  }

  async function probarClave() {
    if (clave === '' || trabajando) return;
    setTrabajando(true);
    const error = await verificarClave(clave);
    setTrabajando(false);

    if (error) return setMensaje(error);
    setClave('');
    onDesbloquear();
  }

  const campo = [
    styles.campo,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      fontSize: 18 * escala,
    },
  ];

  return (
    <Modal visible={visible} animationType="none" onRequestClose={() => {}}>
      <ThemedView style={styles.contenedor}>
        <SafeAreaView style={styles.contenedor}>
          <KeyboardAvoidingView
            style={styles.contenedor}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
              <ThemedText type="subtitle">App bloqueada</ThemedText>
              <ThemedText themeColor="textSecondary">
                Pasó un tiempo desde la última vez que la usaste. Desbloqueala para seguir.
              </ThemedText>

              {!usarClave ? (
                <>
                  {hayPin ? (
                    <>
                      <ThemedText type="smallBold">PIN de 4 dígitos</ThemedText>
                      <TextInput
                        value={pin}
                        onChangeText={(t) => setPin(t.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        secureTextEntry
                        maxLength={4}
                        placeholder="••••"
                        placeholderTextColor={theme.textSecondary}
                        accessibilityLabel="PIN de 4 dígitos"
                        style={campo}
                      />
                      <Button
                        titulo={trabajando ? 'Verificando…' : 'Desbloquear con PIN'}
                        onPress={probarPin}
                      />
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Todavía no creaste un PIN. Podés crearlo en Perfil después de desbloquear.
                    </ThemedText>
                  )}

                  {hayHuella && <Button titulo="Usar huella" variante="secundario" onPress={usarHuella} />}
                  <Button
                    titulo={hayPin ? 'Olvidé mi PIN: usar mi contraseña' : 'Usar mi contraseña'}
                    variante="secundario"
                    onPress={() => {
                      setMensaje('');
                      setUsarClave(true);
                    }}
                  />
                </>
              ) : (
                <>
                  <ThemedText type="smallBold">Contraseña de tu cuenta</ThemedText>
                  <TextInput
                    value={clave}
                    onChangeText={setClave}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Contraseña"
                    placeholderTextColor={theme.textSecondary}
                    accessibilityLabel="Contraseña de tu cuenta"
                    style={campo}
                  />
                  <Button
                    titulo={trabajando ? 'Verificando…' : 'Desbloquear con contraseña'}
                    onPress={probarClave}
                  />
                  <Button
                    titulo="Volver"
                    variante="secundario"
                    onPress={() => {
                      setMensaje('');
                      setUsarClave(false);
                    }}
                  />
                </>
              )}

              {mensaje !== '' && (
                <ThemedText type="small" themeColor="error">
                  {mensaje}
                </ThemedText>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  campo: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
});
