@echo off
cd /d "%~dp0"
if not exist "env.bat" (
  echo [ERROR] Missing env.bat
  exit /b 1
)
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [ERROR] Port 3000 in use. Run kill-port.bat 3000
  netstat -ano | findstr ":3000" | findstr "LISTENING"
  exit /b 1
)
echo [INFO] Starting frontend on 3000 (proxy /api -^> gateway 8080) ...
start "novel-frontend" /MIN cmd /c ""%~dp0_run-frontend.cmd""
echo [OK] Open http://localhost:3000  Log: %~dp0logs\frontend.log
exit /b 0
