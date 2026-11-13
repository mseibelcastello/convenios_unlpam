@echo off
REM Levanta la app movil (Expo) para probarla en un celular real con Expo Go.
REM Antes: correr iniciar-web.bat, y tener el celular en la misma wifi que esta compu.
REM Uso: iniciar-movil.bat   (detecta la IP sola)
REM      iniciar-movil.bat 192.168.1.6   (si queres indicar la IP a mano)

cd /d "%~dp0"

set IP=%1
if "%IP%"=="" (
  for /f %%i in ('powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }).IPv4Address.IPAddress | Select-Object -First 1"') do set IP=%%i
)
if "%IP%"=="" (
  echo No pude averiguar la IP de esta compu. Pasala a mano: iniciar-movil.bat 192.168.x.x
  pause
  exit /b 1
)

set API=http://%IP%:8000/api
echo IP de esta compu: %IP%
echo La app va a usar la API en: %API%

curl -s -m 3 %API%/health >nul
if errorlevel 1 (
  echo.
  echo AVISO: no se puede llegar al backend en %API%
  echo   - Esta corriendo iniciar-web.bat?
  echo   - Si Windows pregunta por el firewall, permitir PHP y Node en redes privadas.
  echo Igual levanto Expo; cuando el backend responda, la app va a funcionar.
)

cd mobile
call npm install

echo.
echo Escanea el codigo QR con Expo Go ^(Android^) o con la camara ^(iPhone^).

set EXPO_PUBLIC_API_URL=%API%
set REACT_NATIVE_PACKAGER_HOSTNAME=%IP%
call npx expo start --lan
