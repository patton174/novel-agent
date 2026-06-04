@echo off
cd /d "%~dp0"
call _dev-env.cmd || exit /b 1
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>&1 && (
  echo [ERROR] Port 8080 in use. kill-port.bat 8080
  exit /b 1
)
start "dev-gateway" cmd /k ""%~dp0_dev-run-gateway.cmd""
echo [OK] Gateway window opened
exit /b 0
