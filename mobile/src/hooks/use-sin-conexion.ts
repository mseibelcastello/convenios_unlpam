import { useNetInfo } from '@react-native-community/netinfo';

// true cuando el celular no tiene red (modo avión, sin Wi-Fi ni datos).
// Mientras todavía no se sabe (isConnected null) se considera que hay conexión.
export function useSinConexion() {
  const { isConnected } = useNetInfo();
  return isConnected === false;
}
