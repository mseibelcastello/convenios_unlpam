import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { sesionVigente } from '@/api/auth';
import { leerToken } from '@/api/sesion';
import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="codigo" />
        <Stack.Screen name="estados" />
      </Stack>
    </ThemeProvider>
  );
}
