@echo off
cd /d "%~dp0"
call _dev-env.cmd || exit /b 1
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1 && (
  echo [ERROR] Port 3000 in use. kill-port.bat 3000
  exit /b 1
)
start "dev-frontend" cmd /k ""%~dp0_dev-run-frontend.cmd""
echo [OK] Frontend window opened - http://localhost:3000
exit /b 0
