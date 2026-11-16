@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title AulaLive - Plataforma Interactiva de Preguntas y Estadisticas
color 0B

:MENU
cls
echo ===============================================================================
echo                A U L A L I V E  -  S I S T E M A   E N   V I V O               
echo          Plataforma Interactiva de Preguntas y Estadisticas de Aula            
echo ===============================================================================
echo.
echo  Selecciona una opcion para ejecutar el sistema:
echo.
echo  [1] Ejecutar Modo Autonomo Inmediato (Recomendado - Sin Dependencias)
echo      - Abre la aplicacion web interactiva al instante en tu navegador.
echo      - Incluye Consola Docente, Pantalla de Proyeccion, Ingreso de Estudiantes
echo        por QR/PIN, Simulacion de Votos, Notas 1.0 a 7.0 y Exportacion Excel.
echo.
echo  [2] Iniciar Sistema Completo con Docker (PostgreSQL + Backend + Frontend)
echo      - Levanta los contenedores oficiales con Docker Compose.
echo      - Base de datos relacional PostgreSQL con trazabilidad y WebSocket en vivo.
echo.
echo  [3] Iniciar Servidores Locales de Desarrollo (Frontend Vite + Backend Node.js)
echo      - Ejecuta los servicios en terminales independientes para depuracion.
echo.
echo  [4] Salir
echo.
echo ===============================================================================
set "OPCION="
set /p OPCION="Ingresa el numero de tu opcion [1-4]: "

if "%OPCION%"=="" goto MENU
if "%OPCION%"=="1" goto STANDALONE
if "%OPCION%"=="2" goto DOCKER
if "%OPCION%"=="3" goto LOCAL_DEV
if "%OPCION%"=="4" goto SALIR

echo.
echo [!] Opcion no valida. Por favor ingresa un numero del 1 al 4.
timeout /t 2 >nul
goto MENU

:STANDALONE
cls
echo ===============================================================================
echo                   Iniciando AulaLive (Modo Web Autonomo)
echo ===============================================================================
echo.
echo [*] Abriendo la aplicacion en tu navegador web predeterminado...

if exist "%~dp0aulalive_standalone_app.html" (
    start "" "%~dp0aulalive_standalone_app.html"
    echo [OK] Archivo abierto: aulalive_standalone_app.html
) else if exist "%~dp0..\aulalive_standalone_app.html" (
    start "" "%~dp0..\aulalive_standalone_app.html"
    echo [OK] Archivo abierto: ..\aulalive_standalone_app.html
) else (
    echo [!] No se encontro el archivo aulalive_standalone_app.html.
)

echo.
echo Presiona cualquier tecla para volver al menu principal...
pause >nul
goto MENU

:DOCKER
cls
echo ===============================================================================
echo                   Iniciando con Docker Compose
echo ===============================================================================
echo.
echo [*] Verificando si Docker Desktop esta en ejecucion...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] ERROR: Docker Desktop no esta iniciado o no esta instalado en este equipo.
    echo     - Asegurate de iniciar Docker Desktop en Windows y reintentar.
    echo     - O utiliza la opcion [1] para ejecutar AulaLive de inmediato sin Docker.
    echo.
    pause
    goto MENU
)

echo [*] Construyendo y levantando contenedores con Docker Compose...
cd /d "%~dp0"
docker-compose up -d --build

echo.
echo [*] Esperando inicializacion de servicios...
timeout /t 5 >nul

echo [*] Abriendo http://localhost:5173 en tu navegador...
start "" "http://localhost:5173"

echo.
echo [OK] Sistema levantado exitosamente:
echo      - Frontend (React + Vite): http://localhost:5173
echo      - Backend API (Express + Socket.IO): http://localhost:4000/api
echo      - Base de Datos (PostgreSQL): puerto 5432
echo.
echo Presiona cualquier tecla para volver al menu principal...
pause >nul
goto MENU

:LOCAL_DEV
cls
echo ===============================================================================
echo                   Iniciando Servidores de Desarrollo Locales
echo ===============================================================================
echo.
echo [*] Lanzando Backend en puerto 4000...
start "AulaLive Backend (Puerto 4000)" /D "%~dp0backend" cmd /k "npm run dev"

echo [*] Esperando 3 segundos...
timeout /t 3 >nul

echo [*] Lanzando Frontend en puerto 5173...
start "AulaLive Frontend (Puerto 5173)" /D "%~dp0frontend" cmd /k "npm run dev"

echo.
echo [*] Abriendo http://localhost:5173 en tu navegador...
timeout /t 4 >nul
start "" "http://localhost:5173"

echo.
echo [OK] Servidores en ejecucion en consolas independientes.
echo.
echo Presiona cualquier tecla para volver al menu principal...
pause >nul
goto MENU

:SALIR
cls
echo.
echo Gracias por utilizar AulaLive.
timeout /t 1 >nul
exit /b 0
