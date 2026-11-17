import axios from 'axios';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { AvisoSinConexion } from '@/components/molecules/AvisoSinConexion';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePreferencias } from '@/context/preferencias';
import { useSinConexion } from '@/hooks/use-sin-conexion';
import { useTheme } from '@/hooks/use-theme';

// Comentarios de un convenio: la lista y un campo para escribir.
// Si el servidor filtra un comentario ofensivo, lo devuelve ya reemplazado
// ("comentario ofensivo") y acá se muestra tal cual.

type Comentario = {
  id: number;
  contenido: string;
  usuario: { id: number; nombre: string } | null;
  fecha: string;
};

export function Comentarios({ convenioId }: { convenioId: number }) {
  const theme = useTheme();
  const { escala } = usePreferencias();
  const sinConexion = useSinConexion();
  const [lista, setLista] = useState<Comentario[]>([]);
  const [pagina, setPagina] = useState(1);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // La API entrega los comentarios de a 20: la página 1 reemplaza la lista, las siguientes se agregan
  async function cargar(numero: number) {
    setCargando(true);
    setError(false);
    try {
      const { data } = await cliente.get(`/agreements/${convenioId}/comments`, { params: { page: numero } });
      setLista(numero === 1 ? data.data : [...lista, ...data.data]);
      setPagina(data.meta.page);
      setUltimaPagina(data.meta.last_page);
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar(1);
  }, [convenioId]);

  async function enviar() {
    const contenido = texto.trim();
    if (contenido === '' || enviando) return;

    setEnviando(true);
    setMensaje('');
    try {
      await cliente.post(`/agreements/${convenioId}/comments`, { contenido });
      setTexto('');
      await cargar(1); // trae la lista de nuevo, con el comentario nuevo
    } catch (e) {
      const datos = axios.isAxiosError(e) ? e.response?.data : null;
      setMensaje(datos?.errors?.contenido?.[0] ?? datos?.message ?? 'No se pudo enviar el comentario.');
    }
    setEnviando(false);
  }

  if (sinConexion) return <AvisoSinConexion completo />;

  return (
    <View style={styles.contenedor}>
      {cargando && lista.length === 0 && (
        <ThemedText themeColor="textSecondary">Cargando comentarios…</ThemedText>
      )}
      {error && (
        <>
          <ThemedText type="small" themeColor="error">
            No se pudieron cargar los comentarios.
          </ThemedText>
          <Button titulo="Reintentar" variante="secundario" onPress={() => cargar(1)} />
        </>
      )}
      {!cargando && !error && lista.length === 0 && (
        <ThemedText themeColor="textSecondary">Todavía no hay comentarios.</ThemedText>
      )}

      {lista.map((c) => (
        <View key={c.id} style={[styles.comentario, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText type="smallBold">{c.usuario?.nombre ?? 'Usuario eliminado'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {new Date(c.fecha).toLocaleString('es-AR')}
          </ThemedText>
          <ThemedText>{c.contenido}</ThemedText>
        </View>
      ))}

      {pagina < ultimaPagina && (
        <Button titulo="Ver más comentarios" variante="secundario" onPress={() => cargar(pagina + 1)} />
      )}

      <TextInput
        value={texto}
        onChangeText={setTexto}
        placeholder="Escribí un comentario"
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel="Escribí un comentario"
        multiline
        maxLength={2000}
        style={[
          styles.campo,
          { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, fontSize: 16 * escala },
        ]}
      />
      <Button titulo={enviando ? 'Enviando…' : 'Enviar comentario'} onPress={enviar} />
      {mensaje !== '' && (
        <ThemedText type="small" themeColor="error">
          {mensaje}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.two },
  comentario: {
    gap: Spacing.half,
    padding: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  campo: {
    minHeight: 80,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
