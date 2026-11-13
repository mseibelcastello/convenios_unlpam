#!/usr/bin/env bash
# Deja todo actualizado y levanta el proyecto:
#   - MySQL (con XAMPP, si no está andando)
#   - Backend en http://localhost:8000 (también accesible desde la red, para el celular)
#   - Web en http://localhost:3000
#   - Muestra en pantalla el código del login (MFA simulado)
#
# Uso:  ./iniciar-web.sh        (Ctrl+C frena todo)
#
# No hace "git pull": primero traé los cambios vos, para no pisar tu trabajo.

set -e
RAIZ="$(cd "$(dirname "$0")" && pwd)"

paso() { echo; echo "==> $1"; }

# Devuelve 0 si algo está escuchando en ese puerto
puerto_en_uso() { (echo > /dev/tcp/127.0.0.1/"$1") 2>/dev/null; }

# 1. MySQL
paso "Revisando MySQL"
if ! puerto_en_uso 3306; then
  echo "MySQL no está andando. Lo inicio con XAMPP (te puede pedir la contraseña de sudo)."
  sudo /opt/lampp/lampp startmysql
  sleep 3
fi
if ! puerto_en_uso 3306; then
  echo "No pude iniciar MySQL. Iniciá XAMPP a mano y volvé a correr el script."
  exit 1
fi
echo "MySQL listo."

# 2. Backend: dependencias, migraciones y unidades
paso "Backend: dependencias y base de datos"
cd "$RAIZ/backend"
if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate
  echo "Se creó backend/.env desde el ejemplo: revisá que los datos de la base sean los tuyos."
fi
composer install --no-interaction
php artisan migrate --force
php artisan db:seed --class=UnidadesSeeder --force

# 3. Web: dependencias
paso "Web: dependencias"
cd "$RAIZ/web"
npm install

# 4. Levantar todo. Con Ctrl+C se frena todo junto.
trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT

paso "Levantando el proyecto"

cd "$RAIZ/backend"
if puerto_en_uso 8000; then
  echo "El backend ya está andando en el puerto 8000."
else
  # --host=0.0.0.0: el celular tiene que poder llegar al backend por la red wifi
  php artisan serve --host=0.0.0.0 --port=8000 &
fi

cd "$RAIZ/web"
if puerto_en_uso 3000; then
  echo "La web ya está andando en el puerto 3000."
else
  npm run dev &
fi

# Muestra cada código de login que genera el backend
tail -n 0 -F "$RAIZ/backend/storage/logs/laravel.log" 2>/dev/null \
  | grep --line-buffered "MFA simulado" \
  | sed -u 's/.*MFA simulado\. /CODIGO DE LOGIN: /' &

echo
echo "Todo listo:"
echo "  Web:     http://localhost:3000"
echo "  Backend: http://localhost:8000/api/health"
echo "  Usuarios de prueba: admin@demo.test, gestion@demo.test, revision@demo.test, consulta@demo.test (contraseña: password)"
echo "  El código del login va a aparecer acá abajo cuando inicies sesión."
echo "  Para la app móvil, en otra terminal: ./iniciar-movil.sh"
echo "  Ctrl+C para frenar todo."

wait
