import { Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { sesionVigente } from '@/api/auth';
import { leerToken } from '@/api/sesion';
import { AnimatedSplashOverlay } from '@/components/splash-unlpam';
import { BloqueoProvider } from '@/context/bloqueo';
import { PreferenciasProvider } from '@/context/preferencias';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [letrasListas] = useFonts({ Montserrat_600SemiBold, Montserrat_700Bold, OpenSans_400Regular, OpenSans_600SemiBold });

  // Al abrir: sin token → login. Con token → se valida con /auth/me y se entra directo.
  useEffect(() => {
    async function revisarSesion() {
      const token = await leerToken();
      if (!token || !(await sesionVigente())) {
        router.replace('/login');
      }
    }
    revisarSesion();
  }, [router]);

  // Hasta que cargan las letras sigue la pantalla de inicio nativa
  if (!letrasListas) return null;

  return (
    <PreferenciasProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <BloqueoProvider>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 250 }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="codigo" />
            <Stack.Screen name="estados" />
            <Stack.Screen name="identidad" />
            <Stack.Screen name="alertas" />
            <Stack.Screen name="qr" />
            <Stack.Screen name="valor" />
            <Stack.Screen name="ayuda" />
          </Stack>
        </BloqueoProvider>
      </ThemeProvider>
    </PreferenciasProvider>
  );
}
