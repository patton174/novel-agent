@echo off
cd /d "%~dp0"
if not exist "env.bat" (
  echo [ERROR] Missing env.bat
  exit /b 1
)
if not exist "dist\agent-pyai-1.0.0-SNAPSHOT.jar" (
  echo [ERROR] pyai JAR missing. Run build.bat first.
  exit /b 1
)
netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] Port 8082 in use. Run kill-port.bat 8082
  netstat -ano | findstr ":8082" | findstr "LISTENING"
  exit /b 1
)
echo [INFO] Starting pyai on 8082 ...
start "agent-pyai" /MIN cmd /c ""%~dp0_run-pyai.cmd""
echo [OK] Log: %~dp0logs\pyai.log
exit /b 0
