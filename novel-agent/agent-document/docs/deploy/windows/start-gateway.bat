@echo off
cd /d "%~dp0"

if not exist "%~dp0env.bat" (
  echo [ERROR] Missing env.bat - run: copy env.bat.example env.bat
  exit /b 1
)

if not exist "%~dp0dist\agent-gateway-1.0.0-SNAPSHOT.jar" (
  echo [ERROR] JAR not found. Put jar in dist\ or run build.bat
  exit /b 1
)

if not exist "%~dp0logs" mkdir "%~dp0logs"

netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] Port 8080 is still in use. Run stop-all.bat or kill-port.bat 8080 first.
  netstat -ano | findstr ":8080" | findstr "LISTENING"
  exit /b 1
)

echo [INFO] Starting gateway on port 8080 ...
start "agent-gateway" /MIN cmd /c ""%~dp0_run-gateway.cmd""

echo [OK] Gateway started. Log: %~dp0logs\gateway.log
exit /b 0
