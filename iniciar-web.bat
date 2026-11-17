@echo off
REM Deja todo actualizado y levanta el proyecto en Windows.
REM Uso: hacer doble clic en este archivo, o correr iniciar-web.bat desde la carpeta principal.
REM Antes: tener MySQL iniciado desde el panel de XAMPP.
REM No hace "git pull": primero trae los cambios vos.

cd /d "%~dp0"

echo.
echo ==^> Revisando MySQL
set MYSQL=
for /f %%i in ('powershell -NoProfile -Command "(Test-NetConnection 127.0.0.1 -Port 3306 -WarningAction SilentlyContinue).TcpTestSucceeded"') do set MYSQL=%%i
if not "%MYSQL%"=="True" (
  echo MySQL no esta andando. Iniciarlo desde el panel de XAMPP ^(boton Start de MySQL^) y volver a correr este archivo.
  pause
  exit /b 1
)
echo MySQL listo.

echo.
echo ==^> Backend: dependencias y base de datos
cd backend
if not exist .env (
  copy .env.example .env >nul
  call php artisan key:generate
  echo Se creo backend\.env desde el ejemplo: revisar que los datos de la base sean los tuyos.
)
call composer install --no-interaction
call php artisan migrate --force
REM Enlace public/storage para las fotos de perfil (solo si todavia no existe)
if not exist public\storage call php artisan storage:link
call php artisan db:seed --class=UnidadesSeeder --force
REM Convenios reales y un usuario por facultad (no repite lo que ya existe)
call php artisan db:seed --class=ConveniosRealesSeeder --force
if not exist storage\logs\laravel.log type nul > storage\logs\laravel.log
cd ..

echo.
echo ==^> Web: dependencias
cd web
call npm install
cd ..

echo.
echo ==^> Levantando el proyecto en ventanas nuevas
start "Backend (puerto 8000)" /D "%~dp0backend" cmd /k php artisan serve --host=0.0.0.0 --port=8000
start "Web (puerto 3000)" /D "%~dp0web" cmd /k npm run dev
start "Codigos de login" /D "%~dp0backend" powershell -NoExit -Command "Get-Content storage\logs\laravel.log -Wait -Tail 0 | Select-String 'MFA simulado'"

echo.
echo Todo listo:
echo   Web:     http://localhost:3000
echo   Backend: http://localhost:8000/api/health
echo   Usuarios de prueba: admin@demo.test, gestion@demo.test, revision@demo.test, consulta@demo.test ^(clave: password^)
echo   Por facultad: gestion.FI@demo.test ^(Ingenieria^), revision.FI@demo.test, consulta.FI@demo.test,
echo                 gestion.FA / FCEyJ / FCEyN / FCH / FCS / FCV @demo.test ^(misma clave^)
echo   El codigo del login aparece en la ventana "Codigos de login" cuando inicies sesion.
echo   Para frenar todo, cerrar las tres ventanas que se abrieron.
echo   Para la app movil: iniciar-movil.bat
pause
