import { useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';

import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Ventana para dibujar la firma a mano con el dedo.
// Al tocar Guardar firma entrega la firma como imagen (texto base64) en onConfirmar.
type FirmaManuscritaProps = {
  visible: boolean;
  onConfirmar: (imagen: string) => void;
  onCancelar: () => void;
};

export function FirmaManuscrita({ visible, onConfirmar, onCancelar }: FirmaManuscritaProps) {
  const [vacia, setVacia] = useState(false);
  const ref = useRef<SignatureViewRef>(null);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancelar}>
      <ThemedView style={styles.contenedor}>
        <SafeAreaView style={styles.area}>
          <View style={styles.encabezado}>
            <ThemedText type="subtitle">Firma a mano</ThemedText>
            <ThemedText themeColor="textSecondary">Dibujá tu firma con el dedo en el recuadro.</ThemedText>
            {vacia && (
              <ThemedText type="small" themeColor="error">
                Dibujá tu firma antes de guardarla.
              </ThemedText>
            )}
          </View>

          <View style={styles.cuadro}>
            <SignatureCanvas
              ref={ref}
              onOK={onConfirmar}
              onEmpty={() => setVacia(true)} // tocó Guardar firma sin dibujar nada
              onBegin={() => setVacia(false)}
              descriptionText="Firmá arriba de esta línea"
              penColor="#000000"
              backgroundColor="#ffffff"
              // Se esconden los botones de la librería: abajo van los de la app
              webStyle=".m-signature-pad--footer { display: none; margin: 0px; }"
            />
          </View>

          <View style={styles.pie}>
            <Button titulo="Guardar firma" onPress={() => ref.current?.readSignature()} />
            <Button
              titulo="Borrar"
              variante="secundario"
              onPress={() => {
                ref.current?.clearSignature();
                setVacia(false);
              }}
            />
            <Button titulo="Cancelar" variante="secundario" onPress={onCancelar} />
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  encabezado: { padding: Spacing.three, gap: Spacing.one },
  cuadro: { flex: 1, marginHorizontal: Spacing.three },
  pie: { padding: Spacing.three, gap: Spacing.two },
});
