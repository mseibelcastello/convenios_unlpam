import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { borrarPin, guardarPin, pinConfigurado } from '@/api/bloqueo';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { SEGUNDOS_PARA_BLOQUEAR, useBloqueo } from '@/context/bloqueo';
import { useTheme } from '@/hooks/use-theme';

// Sección de Perfil para el bloqueo de la app: crear, cambiar o quitar el PIN.
export function BloqueoPerfil() {
  const theme = useTheme();
  const { bloquearAhora } = useBloqueo();
  const [hayPin, setHayPin] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pin, setPin] = useState('');
  const [repetido, setRepetido] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [esError, setEsError] = useState(false);

  function avisar(texto: string, error: boolean) {
    setMensaje(texto);
    setEsError(error);
  }

  useEffect(() => {
    pinConfigurado().then(setHayPin);
  }, []);

  async function guardar() {
    if (pin.length !== 4) return avisar('El PIN tiene que tener 4 dígitos.', true);
    if (pin !== repetido) return avisar('Los dos PIN no coinciden.', true);
    await guardarPin(pin);
    setHayPin(true);
    setEditando(false);
    setPin('');
    setRepetido('');
    avisar('PIN guardado.', false);
  }

  async function quitar() {
    await borrarPin();
    setHayPin(false);
    avisar('PIN quitado.', false);
  }

  const campo = [
    styles.campo,
    {
      color: theme.text,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
  ];
  const soloNumeros = (t: string) => t.replace(/\D/g, '');

  return (
    <View style={[styles.caja, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        Bloqueo de la app
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Si salís de la app más de {SEGUNDOS_PARA_BLOQUEAR} segundos, al volver se pide el PIN, la huella o tu
        contraseña.
      </ThemedText>
      <ThemedText>{hayPin ? '✓ PIN configurado' : 'Sin PIN configurado'}</ThemedText>

      {editando ? (
        <>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(soloNumeros(t))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="PIN de 4 dígitos"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="PIN de 4 dígitos"
            style={campo}
          />
          <TextInput
            value={repetido}
            onChangeText={(t) => setRepetido(soloNumeros(t))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            placeholder="Repetí el PIN"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Repetí el PIN"
            style={campo}
          />
          <Button titulo="Guardar PIN" onPress={guardar} />
          <Button
            titulo="Cancelar"
            variante="secundario"
            onPress={() => {
              setEditando(false);
              setPin('');
              setRepetido('');
              setMensaje('');
            }}
          />
        </>
      ) : (
        <>
          <Button
            titulo={hayPin ? 'Cambiar PIN' : 'Crear PIN'}
            variante="secundario"
            onPress={() => {
              setMensaje('');
              setEditando(true);
            }}
          />
          {hayPin && <Button titulo="Quitar PIN" variante="secundario" onPress={quitar} />}
          <Button titulo="Bloquear ahora (prueba)" variante="secundario" onPress={bloquearAhora} />
        </>
      )}

      {mensaje !== '' && (
        <ThemedText
          type="small"
          themeColor={
            mensaje.endsWith('.') && mensaje.startsWith('PIN ') && !mensaje.includes('4')
              ? 'success'
              : 'error'
          }
        >
          {mensaje}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  campo: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 18,
  },
});
