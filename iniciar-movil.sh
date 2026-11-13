#!/usr/bin/env bash
# Levanta la app móvil (Expo) para probarla en un celular real con Expo Go.
#
# Antes:
#   1. Corré ./iniciar-web.sh en otra terminal (backend y web).
#   2. El celular tiene que estar en la misma red wifi que esta compu.
#   3. Instalá Expo Go en el celular y escaneá el código QR que aparece acá.
#
# Uso:  ./iniciar-movil.sh            (detecta la IP sola)
#       ./iniciar-movil.sh 192.168.1.6   (si querés indicar la IP a mano)

set -e
RAIZ="$(cd "$(dirname "$0")" && pwd)"

# IP de esta compu en la red local: la que se usa para salir a internet
IP="${1:-$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)}"
if [ -z "$IP" ]; then
  echo "No pude averiguar la IP de esta compu. Pasala a mano: ./iniciar-movil.sh 192.168.x.x"
  exit 1
fi

API="http://$IP:8000/api"
echo "IP de esta compu: $IP"
echo "La app va a usar la API en: $API"

# El celular llega al backend por la red, así que tiene que estar escuchando ahí
if ! curl -s -m 3 "$API/health" > /dev/null; then
  echo
  echo "AVISO: no se puede llegar al backend en $API"
  echo "  - ¿Está corriendo ./iniciar-web.sh? Si ya estaba andando de antes, cerralo y volvé a correrlo,"
  echo "    porque tiene que servir en toda la red (--host=0.0.0.0)."
  echo "  - Si usás firewall, hay que dejar pasar los puertos 8000 y 8081."
  echo "Igual levanto Expo; cuando el backend responda, la app va a funcionar."
fi

cd "$RAIZ/mobile"
npm install

echo
echo "Escaneá el código QR con Expo Go (Android) o con la cámara (iPhone)."

# EXPO_PUBLIC_API_URL: dirección de la API que usa la app.
# REACT_NATIVE_PACKAGER_HOSTNAME: IP con la que Expo se anuncia al celular.
EXPO_PUBLIC_API_URL="$API" REACT_NATIVE_PACKAGER_HOSTNAME="$IP" npx expo start --lan
