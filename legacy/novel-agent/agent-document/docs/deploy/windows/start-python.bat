@echo off
cd /d "%~dp0"
if not exist "env.bat" (
  echo [ERROR] Missing env.bat
  exit /b 1
)
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] Port 8000 in use. Run kill-port.bat 8000
  netstat -ano | findstr ":8000" | findstr "LISTENING"
  exit /b 1
)
echo [INFO] Starting Python AI on 8000 ...
start "python-ai" /MIN cmd /c ""%~dp0_run-python.cmd""
echo [OK] Log: %~dp0logs\python-ai.log
exit /b 0
