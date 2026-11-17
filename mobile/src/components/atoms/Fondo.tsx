import { StyleSheet, useColorScheme, View } from 'react-native';
import Svg, { Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

// Fondo de las pantallas, como el panel de la web: crema rosada con una grilla finita
// y dos destellos naranjas que se ven a través de las tarjetas de vidrio.
export function Fondo() {
  const oscuro = useColorScheme() === 'dark';

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: oscuro ? '#1b0f11' : '#fbf1ed' }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="grilla" width={44} height={44} patternUnits="userSpaceOnUse">
            <Line x1="0" y1="0" x2="44" y2="0" stroke={oscuro ? '#ffffff' : '#2e1519'} strokeOpacity={0.035} />
            <Line x1="0" y1="0" x2="0" y2="44" stroke={oscuro ? '#ffffff' : '#2e1519'} strokeOpacity={0.035} />
          </Pattern>
          <RadialGradient id="destelloA" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#ff8a3d" stopOpacity={oscuro ? 0.28 : 0.5} />
            <Stop offset="1" stopColor="#ff8a3d" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="destelloB" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#e86a04" stopOpacity={oscuro ? 0.24 : 0.42} />
            <Stop offset="1" stopColor="#e86a04" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grilla)" />
        {/* Los destellos: uno arriba a la derecha y otro abajo a la izquierda */}
        <Rect x="35%" y="-12%" width="85%" height="45%" fill="url(#destelloA)" />
        <Rect x="-35%" y="62%" width="95%" height="50%" fill="url(#destelloB)" />
      </Svg>
    </View>
  );
}
