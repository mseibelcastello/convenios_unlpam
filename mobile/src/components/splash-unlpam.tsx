import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Splash de inicio: unas nubes naranjas (las del login de la web) llegan al centro, explotan
// y quedan como resplandor detrás del logo de la UNLPam. Sigue el modo claro u oscuro elegido.
//
// Tiempos (en milisegundos):
//   0 – 2000   las nubes viajan hacia el centro
//   2000       explotan (se agrandan y salen chispas)
//   2200       aparecen el logo y "Gestión de convenios"
//   3300       aparece "Tocá para continuar" y el botón "Volver a ver"
// Después queda quieto hasta que se toca la pantalla; entonces se desvanece y se ve la app.

const COLORES = ['#c8181c', '#e86a04', '#ff8a3d']; // rojo, naranja y naranja claro
const CANTIDAD_NUBES = 7;
const CANTIDAD_CHISPAS = 10;
const TAMANO_NUBE = 200;
const PROPORCION_LOGO = 1400 / 407; // ancho / alto de la imagen

// Una nube: un círculo con degradé que va de su punto de partida a su lugar final, cerca del logo
function Nube({
  indice,
  inicio,
  fin,
  viaje,
  explosion,
}: {
  indice: number;
  inicio: { x: number; y: number };
  fin: { x: number; y: number };
  viaje: SharedValue<number>;
  explosion: SharedValue<number>;
}) {
  const color = COLORES[indice % COLORES.length];

  const estilo = useAnimatedStyle(() => {
    const t = viaje.get();
    const e = explosion.get();
    return {
      opacity: 0.55 + 0.45 * t,
      transform: [
        { translateX: interpolate(t, [0, 1], [inicio.x, fin.x]) },
        { translateY: interpolate(t, [0, 1], [inicio.y, fin.y]) },
        { scale: (0.5 + 0.5 * t) * (1 + 2 * e) }, // crece al llegar y se agranda con la explosión
      ],
    };
  });

  return (
    <Animated.View style={[styles.centrado, estilo]}>
      <Svg width={TAMANO_NUBE} height={TAMANO_NUBE}>
        <Defs>
          <RadialGradient id={`nube${indice}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.85" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={TAMANO_NUBE / 2} cy={TAMANO_NUBE / 2} r={TAMANO_NUBE / 2} fill={`url(#nube${indice})`} />
      </Svg>
    </Animated.View>
  );
}

// Una chispa: un puntito que sale disparado desde el centro durante la explosión
function Chispa({ angulo, distancia, avance }: { angulo: number; distancia: number; avance: SharedValue<number> }) {
  const estilo = useAnimatedStyle(() => {
    const a = avance.get();
    return {
      opacity: 1 - a,
      transform: [
        { translateX: Math.cos(angulo) * distancia * a },
        { translateY: Math.sin(angulo) * distancia * a },
      ],
    };
  });

  return <Animated.View style={[styles.chispa, estilo]} />;
}

export function AnimatedSplashOverlay() {
  const { width, height } = useWindowDimensions();
  const oscuro = useColorScheme() === 'dark';
  const colores = oscuro ? Colors.dark : Colors.light;
  const { bottom } = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const [empezar, setEmpezar] = useState(false);
  const [vuelta, setVuelta] = useState(0); // sube cada vez que se toca "Volver a ver"

  const viaje = useSharedValue(0); // 0 → 1: las nubes llegan al centro
  const explosion = useSharedValue(0); // sube a 1 de golpe y queda en 0.3 (resplandor)
  const chispas = useSharedValue(0); // 0 → 1: las chispas salen y se apagan
  const logo = useSharedValue(0); // 0 → 1: aparece el logo
  const pista = useSharedValue(0); // 0 → 1: aparecen "Tocá para continuar" y el botón
  const salida = useSharedValue(1); // 1 → 0: se desvanece todo

  useEffect(() => {
    if (!empezar) return;
    viaje.set(withTiming(1, { duration: 2000, easing: Easing.in(Easing.cubic) }));
    explosion.set(
      withDelay(
        2000,
        withSequence(
          withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }),
          withTiming(0.3, { duration: 1000 }),
        ),
      ),
    );
    chispas.set(withDelay(2000, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) })));
    logo.set(withDelay(2200, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
    pista.set(withDelay(3300, withTiming(1, { duration: 700 })));
  }, [empezar, vuelta, viaje, explosion, chispas, logo, pista]);

  // Un toque en la pantalla: se desvanece y se ve la app
  function continuar() {
    salida.set(
      withTiming(0, { duration: 400 }, (terminó) => {
        'worklet';
        if (terminó) scheduleOnRN(setVisible, false);
      }),
    );
  }

  // Todo vuelve al principio y la animación arranca de nuevo
  function volverAVer() {
    viaje.set(0);
    explosion.set(0);
    chispas.set(0);
    logo.set(0);
    pista.set(0);
    setVuelta(vuelta + 1);
  }

  const estiloSalida = useAnimatedStyle(() => ({ opacity: salida.get() }));
  const estiloPista = useAnimatedStyle(() => ({ opacity: pista.get() }));
  const estiloLogo = useAnimatedStyle(() => ({
    opacity: logo.get(),
    transform: [{ scale: interpolate(logo.get(), [0, 1], [0.85, 1]) }],
  }));

  if (!visible) return null;

  // Las nubes parten desde afuera de la pantalla, repartidas en círculo, y terminan cerca del logo
  const radioInicio = Math.max(width, height) * 0.6;
  const nubes = Array.from({ length: CANTIDAD_NUBES }, (_, i) => {
    const angulo = (i / CANTIDAD_NUBES) * Math.PI * 2;
    const radioFin = 40 + (i % 3) * 25;
    return {
      inicio: { x: Math.cos(angulo) * radioInicio, y: Math.sin(angulo) * radioInicio },
      fin: { x: Math.cos(angulo + 1) * radioFin * 2, y: Math.sin(angulo + 1) * radioFin * 0.6 },
    };
  });

  const anchoLogo = Math.min(width * 0.78, 340);

  return (
    <Animated.View
      // Cuando la pantalla ya se dibujó, se oculta el splash nativo y empieza la animación
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => setEmpezar(true));
      }}
      style={[styles.overlay, { backgroundColor: colores.background }, estiloSalida]}>
      {/* Tocar en cualquier parte continúa */}
      <Pressable
        onPress={continuar}
        accessibilityRole="button"
        accessibilityLabel="Continuar"
        style={styles.toque}>
        {nubes.map((n, i) => (
          <Nube key={i} indice={i} inicio={n.inicio} fin={n.fin} viaje={viaje} explosion={explosion} />
        ))}

        {Array.from({ length: CANTIDAD_CHISPAS }, (_, i) => (
          <Chispa
            key={i}
            angulo={(i / CANTIDAD_CHISPAS) * Math.PI * 2}
            distancia={110 + (i % 3) * 50}
            avance={chispas}
          />
        ))}

        <Animated.View style={[styles.marca, estiloLogo]}>
          <Image
            // Con fondo oscuro, el logo con letras claras; con fondo claro, el de letras oscuras
            source={
              oscuro
                ? require('@/assets/images/logo-unlpam-claro.png')
                : require('@/assets/images/logo-unlpam-oscuro.png')
            }
            style={{ width: anchoLogo, height: anchoLogo / PROPORCION_LOGO }}
            contentFit="contain"
          />
          <Text style={[styles.titulo, { color: colores.text }]}>Gestión de convenios</Text>
        </Animated.View>

        <Animated.View style={[styles.pie, { bottom: bottom + 28 }, estiloPista]}>
          <Text style={[styles.pista, { color: colores.textSecondary }]}>Tocá para continuar</Text>
          <Pressable
            onPress={volverAVer}
            accessibilityRole="button"
            accessibilityLabel="Volver a ver la animación"
            hitSlop={8}
            style={styles.botonVer}>
            <Text style={[styles.textoVer, { color: colores.primary }]}>Volver a ver</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, overflow: 'hidden' },
  toque: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pie: { position: 'absolute', alignItems: 'center', gap: 4 },
  pista: { fontFamily: 'OpenSans_400Regular', fontSize: 13, letterSpacing: 0.5 },
  botonVer: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  textoVer: { fontFamily: 'OpenSans_600SemiBold', fontSize: 14 },
  marca: { alignItems: 'center', gap: 20 },
  titulo: { fontFamily: 'Montserrat_600SemiBold', fontSize: 18, letterSpacing: 1 },
  // Las nubes se apilan en el centro y después se mueven con translate
  centrado: { position: 'absolute' },
  chispa: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff8a3d' },
});
