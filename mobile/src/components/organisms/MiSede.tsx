import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Tarjeta } from '@/components/atoms/Tarjeta';
import { borrarSede, guardarSede, leerSede, sedeCercana, type SedeElegida } from '@/api/sede';
import { cliente } from '@/api/cliente';
import { Button } from '@/components/atoms/Button';
import { Opciones } from '@/components/molecules/Opciones';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { SEDES } from '@/constants/sedes';
import { useTheme } from '@/hooks/use-theme';

// Sede de la persona. Al abrir la app se pregunta si quiere usar la ubicación para reconocerla:
//  - Si acepta: se toma la posición UNA sola vez (sin seguimiento) y se compara con las sedes.
//  - Si no acepta (o no hay sede cerca): elige su unidad a mano.
// Con la sede elegida se muestra una bienvenida y un acceso rápido a los convenios de esa unidad.

type Unidad = { id: number; sigla: string; nombre: string };
type Paso = 'cargando' | 'preguntar' | 'ubicando' | 'elegir' | 'listo';

export function MiSede() {
  const theme = useTheme();
  const [paso, setPaso] = useState<Paso>('cargando');
  const [sede, setSede] = useState<SedeElegida | null>(null);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function iniciar() {
      const guardada = await leerSede();
      setSede(guardada);
      setPaso(guardada ? 'listo' : 'preguntar');
    }
    iniciar();
  }, []);

  async function traerUnidades() {
    try {
      const { data } = await cliente.get<Unidad[]>('/unidades');
      setUnidades(data);
      return data;
    } catch {
      setMensaje('No se pudieron cargar las unidades.');
      return [];
    }
  }

  function elegir(unidad: Unidad, porUbicacion: boolean) {
    const nueva = {
      unidadId: unidad.id,
      sigla: unidad.sigla,
      nombre: unidad.nombre,
      porUbicacion,
    };
    setSede(nueva);
    guardarSede(nueva);
    setMensaje('');
    setPaso('listo');
  }

  // Rama 1: usa la ubicación (una sola vez)
  async function usarUbicacion() {
    setMensaje('');
    setPaso('ubicando');
    const lista = await traerUnidades();

    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') {
        setMensaje('No diste permiso de ubicación. Elegí tu unidad a mano.');
        return setPaso('elegir');
      }

      // Una sola lectura: no se hace seguimiento ni se guarda la posición
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const cercana = sedeCercana(posicion.coords.latitude, posicion.coords.longitude);
      const unidad = cercana ? lista.find((u) => u.sigla === cercana.sigla) : undefined;

      if (unidad) return elegir(unidad, true);
      setMensaje('No estás cerca de ninguna sede. Elegí tu unidad a mano.');
    } catch {
      setMensaje('No se pudo obtener tu ubicación. Elegí tu unidad a mano.');
    }
    setPaso('elegir');
  }

  // Rama 2: no acepta, selector manual
  async function elegirAMano() {
    setMensaje('');
    setPaso('elegir');
    if (unidades.length === 0) await traerUnidades();
  }

  async function cambiar() {
    await borrarSede();
    setSede(null);
    setMensaje('');
    setPaso('preguntar');
  }

  return (
    <>
      <Modal visible={paso === 'preguntar' || paso === 'ubicando'} transparent animationType="fade">
        <View style={styles.fondo}>
          <View style={[styles.dialogo, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText type="subtitle">¿Usar tu ubicación?</ThemedText>
            <ThemedText>
              Podemos usar tu ubicación para reconocer tu sede de la UNLPam y mostrarte sus convenios.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Se toma una sola vez, ahora. No se hace seguimiento y la posición no se guarda. Es optativo.
            </ThemedText>
            <Button
              titulo={paso === 'ubicando' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
              onPress={usarUbicacion}
            />
            <Button titulo="No, elegir mi unidad a mano" variante="secundario" onPress={elegirAMano} />
          </View>
        </View>
      </Modal>

      {paso === 'elegir' && (
        <Tarjeta acento="#e86a04" style={styles.caja}>
          <ThemedText type="smallBold">Elegí tu unidad</ThemedText>
          {mensaje !== '' && (
            <ThemedText type="small" themeColor="error">
              {mensaje}
            </ThemedText>
          )}
          <Opciones
            titulo=""
            opciones={unidades.map((u) => ({
              valor: String(u.id),
              texto: u.sigla,
            }))}
            valor=""
            onElegir={(valor) => {
              const u = unidades.find((x) => String(x.id) === valor);
              if (u) elegir(u, false);
            }}
          />
        </Tarjeta>
      )}

      {paso === 'listo' && sede && (
        <Tarjeta acento="#e86a04" style={styles.caja}>
          <ThemedText type="smallBold">
            {sede.porUbicacion ? `¡Te damos la bienvenida a ${sede.nombre}!` : `Tu unidad: ${sede.nombre}`}
          </ThemedText>
          <Button
            titulo={`Ver convenios de ${sede.sigla}`}
            onPress={() =>
              router.navigate({
                pathname: '/buscar',
                params: { unidad: String(sede.unidadId) },
              })
            }
          />
          <Button titulo="Cambiar" variante="secundario" onPress={cambiar} />
        </Tarjeta>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dialogo: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.large,
  },
  caja: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
});
