import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cliente } from '@/api/cliente';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { LoadingView } from '@/components/atoms/LoadingView';
import { ErrorView } from '@/components/molecules/ErrorView';
import { Opciones } from '@/components/molecules/Opciones';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, type EstadoConvenio } from '@/constants/theme';
import { textoDelTipo } from '@/constants/tipos';
import { useTheme } from '@/hooks/use-theme';

// Lo que usamos de las respuestas de la API
type Parte = {
  id: number;
  nombre: string;
  representante: string | null;
  cargo_representante: string | null;
  pivot: { rol_parte: string };
};

type Convenio = {
  id: number;
  codigo: string;
  titulo: string;
  tipo: string;
  estado: EstadoConvenio;
  fecha_firma: string | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  unidad: { nombre: string; sigla: string };
  partes: Parte[];
  // Solo viene si el convenio está firmado (y el usuario no es de Consulta)
  firma?: {
    usuario: { nombre: string } | null;
    fecha: string;
    latitud: number;
    longitud: number;
    imagen: string | null;
  } | null;
};

type Documento = { id: number; tipo: string; nombre_original: string; version: number };
type Padre = { id: number; codigo: string; titulo: string };

// Tipos de documento que se pueden subir (los mismos que acepta la API)
const TIPOS_DOCUMENTO = [
  { valor: 'principal', texto: 'Principal' },
  { valor: 'anexo', texto: 'Anexo' },
  { valor: 'dictamen', texto: 'Dictamen' },
  { valor: 'resolucion', texto: 'Resolución' },
  { valor: 'otro', texto: 'Otro' },
];

// La API manda "2025-11-10"; se muestra "10/11/2025"
function fecha(f: string | null) {
  return f ? f.split('-').reverse().join('/') : 'Sin fecha';
}

// Cada bloque de la ficha: caja con título, siempre igual
function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.seccion, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {titulo}
      </ThemedText>
      {children}
    </View>
  );
}

// Un dato: etiqueta chica arriba y valor abajo
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <ThemedText type="small" themeColor="textSecondary">
        {etiqueta}
      </ThemedText>
      <ThemedText>{valor}</ThemedText>
    </View>
  );
}

export default function FichaConvenio() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [convenio, setConvenio] = useState<Convenio | null>(null);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  // Para subir documentos
  const [rol, setRol] = useState('');
  const [tipoDoc, setTipoDoc] = useState('principal');
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [mensajeEsError, setMensajeEsError] = useState(false);

  async function cargar() {
    setCargando(true);
    setError(false);
    try {
      const [c, vinculos, docs, yo] = await Promise.all([
        cliente.get(`/agreements/${id}`),
        cliente.get(`/agreements/${id}/links`),
        cliente.get(`/agreements/${id}/documents`),
        cliente.get('/auth/me'),
      ]);
      setConvenio(c.data);
      setPadres(vinculos.data.antecedentes); // los convenios en los que este se apoya
      setDocumentos(docs.data.data);
      setRol(yo.data.user.rol);
      // Revisión solo puede subir dictámenes
      setTipoDoc(yo.data.user.rol === 'revision' ? 'dictamen' : 'principal');
    } catch {
      setError(true);
    }
    setCargando(false);
  }

  // Se vuelve a cargar cada vez que se entra o se vuelve a esta pantalla (por ejemplo, después de firmar)
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [id]),
  );

  function avisar(texto: string, esError: boolean) {
    setMensaje(texto);
    setMensajeEsError(esError);
  }

  // Elige un PDF del celular y lo sube al convenio
  async function subirDocumento() {
    if (subiendo) return;
    avisar('', false);
    if (!tipoDoc) return avisar('Elegí el tipo de documento.', true);

    const elegido = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (elegido.canceled) return;
    const archivo = elegido.assets[0];

    setSubiendo(true);
    try {
      const formulario = new FormData();
      formulario.append('tipo', tipoDoc);
      // En React Native un archivo se manda como { uri, name, type }
      formulario.append('archivo', { uri: archivo.uri, name: archivo.name, type: 'application/pdf' } as unknown as Blob);

      await cliente.post(`/agreements/${id}/documents`, formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // un PDF grande tarda más que los 10 segundos de siempre
      });
      await cargar(); // trae la lista de documentos de nuevo
      avisar('Documento subido.', false);
    } catch (e) {
      const datos = axios.isAxiosError(e) ? e.response?.data : null;
      avisar(datos?.errors?.archivo?.[0] ?? datos?.message ?? 'No se pudo subir el documento.', true);
    }
    setSubiendo(false);
  }

  function contenido() {
    if (cargando) return <LoadingView />;
    if (error || !convenio) {
      return <ErrorView mensaje="No se pudo cargar el convenio." onReintentar={cargar} />;
    }

    return (
      <ScrollView contentContainerStyle={styles.contenido}>
        <Button titulo="← Volver" variante="secundario" onPress={() => router.back()} />

        {/* Encabezado: lo primero que se ve */}
        <View style={styles.encabezado}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {convenio.codigo} · {textoDelTipo(convenio.tipo)}
          </ThemedText>
          <ThemedText type="subtitle">{convenio.titulo}</ThemedText>
          <View style={styles.estado}>
            <Badge estado={convenio.estado} />
          </View>
        </View>

        <Seccion titulo="Procedencia">
          <ThemedText>
            {convenio.unidad.nombre} ({convenio.unidad.sigla})
          </ThemedText>
        </Seccion>

        <Seccion titulo="Firmantes">
          {convenio.partes.length === 0 && (
            <ThemedText themeColor="textSecondary">Sin firmantes registrados.</ThemedText>
          )}
          {convenio.partes.map((p) => (
            <View key={p.id} style={styles.dato}>
              <ThemedText type="small" themeColor="textSecondary">
                {p.pivot.rol_parte}
              </ThemedText>
              <ThemedText>{p.nombre}</ThemedText>
              {p.representante && (
                <ThemedText type="small">
                  {p.representante}
                  {p.cargo_representante ? ` · ${p.cargo_representante}` : ''}
                </ThemedText>
              )}
            </View>
          ))}
        </Seccion>

        <Seccion titulo="Fechas">
          <Dato etiqueta="Firma" valor={fecha(convenio.fecha_firma)} />
          <Dato etiqueta="Inicio" valor={fecha(convenio.fecha_inicio)} />
          <Dato
            etiqueta="Vencimiento"
            valor={convenio.fecha_vencimiento ? fecha(convenio.fecha_vencimiento) : 'Sin vencimiento registrado'}
          />
        </Seccion>

        {convenio.firma && (
          <Seccion titulo="Firma">
            <Dato etiqueta="Firmado por" valor={convenio.firma.usuario?.nombre ?? 'Sin dato'} />
            <Dato etiqueta="Fecha" valor={fecha(convenio.firma.fecha.slice(0, 10))} />
            <Dato etiqueta="Hora" valor={`${convenio.firma.fecha.slice(11, 19)} hs`} />
            <Dato etiqueta="Latitud" valor={String(convenio.firma.latitud)} />
            <Dato etiqueta="Longitud" valor={String(convenio.firma.longitud)} />
            {convenio.firma.imagen && (
              <View style={styles.firmaDibujada}>
                <Image source={{ uri: convenio.firma.imagen }} style={styles.imagenFirma} resizeMode="contain" />
              </View>
            )}
          </Seccion>
        )}

        {padres.length > 0 && (
          <Seccion titulo="Convenio padre">
            {padres.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/convenio/${p.id}`)}
                accessibilityRole="link"
                accessibilityLabel={`Abrir ${p.codigo}`}>
                <ThemedText type="link">
                  {p.codigo} · {p.titulo}
                </ThemedText>
              </Pressable>
            ))}
          </Seccion>
        )}

        <Seccion titulo="Documentos">
          {documentos.length === 0 && <ThemedText themeColor="textSecondary">Sin documentos.</ThemedText>}
          {documentos.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => router.push(`/documento/${d.id}?convenio=${convenio.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${d.nombre_original}`}
              style={styles.dato}>
              <ThemedText type="link">📄 {d.nombre_original}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {d.tipo} · versión {d.version} · tocá para leerlo
              </ThemedText>
            </Pressable>
          ))}

          {/* Consulta no sube documentos */}
          {['administracion', 'gestion', 'revision'].includes(rol) && (
            <View style={styles.subida}>
              <Opciones
                titulo="Subir un documento"
                opciones={rol === 'revision' ? TIPOS_DOCUMENTO.filter((t) => t.valor === 'dictamen') : TIPOS_DOCUMENTO}
                valor={tipoDoc}
                onElegir={setTipoDoc}
              />
              <Button
                titulo={subiendo ? 'Subiendo…' : 'Elegir PDF y subir'}
                variante="secundario"
                onPress={subirDocumento}
              />
              {mensaje !== '' && (
                <ThemedText type="small" themeColor={mensajeEsError ? 'error' : 'success'}>
                  {mensaje}
                </ThemedText>
              )}
            </View>
          )}
        </Seccion>
      </ScrollView>
    );
  }

  return (
    <ThemedView style={[styles.contenedor, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.area}>{contenido()}</SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  area: { flex: 1 },
  contenido: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  encabezado: { gap: Spacing.one },
  estado: { flexDirection: 'row', marginTop: Spacing.one },
  seccion: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  dato: { gap: Spacing.half },
  subida: { gap: Spacing.two, marginTop: Spacing.two },
  firmaDibujada: { backgroundColor: '#ffffff', borderRadius: Radius.small, padding: Spacing.two },
  imagenFirma: { width: '100%', height: 120 },
});
