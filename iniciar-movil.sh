#!/usr/bin/env bash
# Levanta la app móvil (Expo) para probarla en un celular real con Expo Go.
#
# Levanta MySQL, el backend y Expo (la web no hace falta).
#   1. El celular tiene que estar en la misma red wifi que esta compu.
#   2. Instalá Expo Go en el celular y escaneá el código QR que aparece acá.
#   Si el backend ya estaba andando de antes, tiene que haber sido con --host=0.0.0.0.
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

# Con Ctrl+C se frena todo junto (backend y Expo)
trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT

# Devuelve 0 si algo está escuchando en ese puerto
puerto_en_uso() { (echo > /dev/tcp/127.0.0.1/"$1") 2>/dev/null; }

# MySQL (con XAMPP, si no está andando)
if ! puerto_en_uso 3306; then
  echo "MySQL no está andando. Lo inicio con XAMPP (te puede pedir la contraseña de sudo)."
  sudo /opt/lampp/lampp startmysql
  sleep 3
fi
if ! puerto_en_uso 3306; then
  echo "No pude iniciar MySQL. Iniciá XAMPP a mano y volvé a correr el script."
  exit 1
fi

# Backend: tiene que escuchar en toda la red (0.0.0.0) para que el celular llegue
if puerto_en_uso 8000; then
  echo "El backend ya está andando en el puerto 8000."
else
  (cd "$RAIZ/backend" && php artisan serve --host=0.0.0.0 --port=8000) &
  sleep 3
fi

cd "$RAIZ/mobile"
npm install

echo
echo "Escaneá este código QR con Expo Go (Android) o con la cámara (iPhone):"
echo "(si no se ve bien, en Expo Go elegí 'Enter URL manually' y escribí exp://$IP:8081)"
echo
node scripts/mostrar-qr.js "exp://$IP:8081"
echo

# EXPO_PUBLIC_API_URL: dirección de la API que usa la app.
# REACT_NATIVE_PACKAGER_HOSTNAME: IP con la que Expo se anuncia al celular.
EXPO_PUBLIC_API_URL="$API" REACT_NATIVE_PACKAGER_HOSTNAME="$IP" npx expo start --lan
