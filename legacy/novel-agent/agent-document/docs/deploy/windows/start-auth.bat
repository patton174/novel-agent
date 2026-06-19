@echo off
cd /d "%~dp0"

if not exist "%~dp0env.bat" (
  echo [ERROR] Missing env.bat - run: copy env.bat.example env.bat
  exit /b 1
)

if not exist "%~dp0dist\agent-auth-1.0.0-SNAPSHOT.jar" (
  echo [ERROR] JAR not found. Put jar in dist\ or run build.bat
  exit /b 1
)

if not exist "%~dp0logs" mkdir "%~dp0logs"

netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] Port 8081 is still in use. Run stop-all.bat or kill-port.bat 8081 first.
  echo [INFO] Current listeners:
  netstat -ano | findstr ":8081" | findstr "LISTENING"
  exit /b 1
)

echo [INFO] Starting auth service on port 8081 ...
start "agent-auth" /MIN cmd /c ""%~dp0_run-auth.cmd""

echo [OK] Auth started. Log: %~dp0logs\auth.log
exit /b 0
