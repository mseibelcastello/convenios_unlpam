#!/usr/bin/env bash
# Levanta el proyecto para PROBAR EL MODO SIN CONEXIÓN de la web.
# A diferencia de iniciar-web.sh, la web corre en modo producción (build + start): en "npm run dev"
# Next no precarga las rutas y lo de sin conexión no anda.
#
# Uso:  ./iniciar-web-offline.sh        (Ctrl+C frena todo)
#
# Después de cambiar código hay que volver a correrlo (el build tarda un rato).

set -e
RAIZ="$(cd "$(dirname "$0")" && pwd)"

paso() { echo; echo "==> $1"; }
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

# 2. La web en modo desarrollo usa la misma carpeta .next: si está andando, el build la rompe
if puerto_en_uso 3000; then
  echo
  echo "Ya hay algo andando en el puerto 3000 (seguramente iniciar-web.sh, en modo desarrollo)."
  echo "Frenalo (Ctrl+C en su terminal) y volvé a correr este script."
  exit 1
fi

# 3. Backend
paso "Backend: dependencias y base de datos"
cd "$RAIZ/backend"
if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate
  echo "Se creó backend/.env desde el ejemplo: revisá que los datos de la base sean los tuyos."
fi
composer install --no-interaction
php artisan migrate --force
[ -e public/storage ] || php artisan storage:link
php artisan db:seed --class=UnidadesSeeder --force
if [ "$(php artisan tinker --execute='echo App\Models\User::count();' 2>/dev/null | tail -n 1)" = "0" ]; then
  php artisan db:seed --class=DemoSeeder --force
fi

# 4. Web: dependencias y build de producción
paso "Web: dependencias y build de producción (tarda un rato)"
cd "$RAIZ/web"
npm install
npm run build

# 5. Levantar todo. Con Ctrl+C se frena todo junto.
trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT

paso "Levantando el proyecto"

cd "$RAIZ/backend"
if puerto_en_uso 8000; then
  echo "El backend ya está andando en el puerto 8000."
else
  php artisan serve --host=0.0.0.0 --port=8000 &
fi

cd "$RAIZ/web"
npm run start &

tail -n 0 -F "$RAIZ/backend/storage/logs/laravel.log" 2>/dev/null \
  | grep --line-buffered "MFA simulado" \
  | sed -u 's/.*MFA simulado\. /CODIGO DE LOGIN: /' &

echo
echo "Todo listo (web en modo producción):"
echo "  Web:     http://localhost:3000"
echo "  Backend: http://localhost:8000/api/health"
echo "  Usuarios de prueba (contraseña: password): admin@demo.test, consulta@demo.test,"
echo "                gestion@demo.test y revision@demo.test"
echo "  El código del login va a aparecer acá abajo cuando inicies sesión."
echo
echo "Cómo probar lo de sin conexión:"
echo "  1. Con internet, iniciá sesión y abrí los convenios que quieras ver sin conexión (así se guardan)."
echo "  2. Cortá la red (DevTools > Network > Offline). Navegá con los links, SIN recargar la página (F5 muestra el dino)."
echo "  3. Editá un convenio en borrador y guardá: queda en cola. Al volver la red se envía solo."
echo "  Ctrl+C para frenar todo."

wait
