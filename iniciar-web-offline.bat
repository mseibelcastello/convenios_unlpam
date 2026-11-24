@echo off
REM Levanta el proyecto para PROBAR EL MODO SIN CONEXION de la web (la web corre en modo produccion:
REM en "npm run dev" Next no precarga las rutas y lo de sin conexion no anda).
REM Antes: tener MySQL iniciado desde el panel de XAMPP y frenar iniciar-web.bat si estaba andando.
REM Despues de cambiar codigo hay que volver a correrlo (el build tarda un rato).

cd /d "%~dp0"

echo.
echo ==^> Revisando MySQL
set MYSQL=
for /f %%i in ('powershell -NoProfile -Command "(Test-NetConnection 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded"') do set MYSQL=%%i
if not "%MYSQL%"=="True" (
  echo MySQL no esta andando. Iniciarlo desde el panel de XAMPP y volver a correr este archivo.
  pause
  exit /b 1
)

set WEB=
for /f %%i in ('powershell -NoProfile -Command "(Test-NetConnection 127.0.0.1 -Port 3000 -WarningAction SilentlyContinue).TcpTestSucceeded"') do set WEB=%%i
if "%WEB%"=="True" (
  echo Ya hay algo andando en el puerto 3000 ^(seguramente iniciar-web.bat^). Cerrar su ventana y volver a correr este archivo.
  pause
  exit /b 1
)

echo.
echo ==^> Backend: dependencias y base de datos
cd backend
if not exist .env (
  copy .env.example .env >nul
  call php artisan key:generate
)
call composer install --no-interaction
call php artisan migrate --force
if not exist public\storage call php artisan storage:link
call php artisan db:seed --class=UnidadesSeeder --force
php artisan tinker --execute="echo App\Models\User::count();" | findstr /x "0" >nul && call php artisan db:seed --class=DemoSeeder --force
if not exist storage\logs\laravel.log type nul > storage\logs\laravel.log
cd ..

echo.
echo ==^> Web: dependencias y build de produccion ^(tarda un rato^)
cd web
call npm install
call npm run build
if errorlevel 1 (
  echo El build fallo. Revisar los errores de arriba.
  pause
  exit /b 1
)
cd ..

echo.
echo ==^> Levantando el proyecto en ventanas nuevas
start "Backend (puerto 8000)" /D "%~dp0backend" cmd /k php artisan serve --host=0.0.0.0 --port=8000
start "Web produccion (puerto 3000)" /D "%~dp0web" cmd /k npm run start
start "Codigos de login" /D "%~dp0backend" powershell -NoExit -Command "Get-Content storage\logs\laravel.log -Wait -Tail 0 | Select-String 'MFA simulado'"

echo.
echo Todo listo ^(web en modo produccion^): http://localhost:3000
echo Como probar sin conexion:
echo   1. Con internet, iniciar sesion y abrir los convenios que se quieran ver sin conexion.
echo   2. Cortar la red ^(DevTools ^> Network ^> Offline^) y navegar con los links, SIN recargar ^(F5 muestra el dino^).
echo   3. Editar un convenio en borrador y guardar: queda en cola y se envia al volver la red.
echo   Para frenar todo, cerrar las tres ventanas.
pause
