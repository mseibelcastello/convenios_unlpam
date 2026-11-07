import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type EstadoConvenio } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

//tarjeta que muestra un convenio, importa y usa Badge y Button

type ConvenioCardProps = {                                  //recibe los datos de la api, de momento no sabe de donde vienen 
  titulo: string;
  codigo: string;
  unidad: string;
  estado: EstadoConvenio;
  onVer: () => void;
};

export function ConvenioCard({ titulo, codigo, unidad, estado, onVer }: ConvenioCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tarjeta,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.encabezado}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {codigo}
        </ThemedText>
        <Badge estado={estado} />
      </View>
      <ThemedText type="default" style={styles.titulo}>
        {titulo}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {unidad}
      </ThemedText>
      <Button titulo="Ver" variante="secundario" onPress={onVer} />
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.large,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  titulo: {
    fontWeight: '700',
  },
});