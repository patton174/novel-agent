@echo off
cd /d "%~dp0"

if not exist "%~dp0env.bat" (
  echo [ERROR] Missing env.bat - run: copy env.bat.example env.bat
  exit /b 1
)

if not exist "%~dp0dist\agent-consumer-1.0.0-SNAPSHOT.jar" (
  echo [ERROR] JAR not found. Put jar in dist\ or run build-consumer.bat
  exit /b 1
)

if not exist "%~dp0logs" mkdir "%~dp0logs"

netstat -ano | findstr ":8090" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] Port 8090 is still in use. Run kill-port.bat 8090 first.
  netstat -ano | findstr ":8090" | findstr "LISTENING"
  exit /b 1
)

echo [INFO] Starting consumer on port 8090 ...
start "agent-consumer" /MIN cmd /c ""%~dp0_run-consumer.cmd""

echo [OK] Consumer started. Log: %~dp0logs\consumer.log
exit /b 0
