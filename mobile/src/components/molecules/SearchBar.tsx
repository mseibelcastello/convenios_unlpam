import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

//es un campo de texto con un boton al lado, combina un textinput con el atomo butto.tsx

type SearchBarProps = {
  onBuscar: (texto: string) => void;
  placeholder?: string;
};

export function SearchBar({ onBuscar, placeholder = 'Buscar convenio' }: SearchBarProps) {
  const theme = useTheme();
  const [texto, setTexto] = useState('');                                                   //guarda lo que la persona escribe

  return (
    <View style={styles.fila}>
      <TextInput
        value={texto}
        onChangeText={setTexto}                                                             //se actualiza ne cada tecla que se presiona
        onSubmitEditing={() => onBuscar(texto)}                                             //avisa a la funcion onBuscar que texto se busco presionando enter
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      />
      {/* avisa a onBuscar qué texto se buscó al presionar el botón */}
      <Button titulo="Buscar" onPress={() => onBuscar(texto)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 16,
  },
});