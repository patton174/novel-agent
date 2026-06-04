@echo off
cd /d "%~dp0"
call _dev-env.cmd || exit /b 1
netstat -ano | findstr ":8082" | findstr "LISTENING" >nul 2>&1 && (
  echo [ERROR] Port 8082 in use. kill-port.bat 8082
  exit /b 1
)
start "dev-pyai" cmd /k ""%~dp0_dev-run-pyai.cmd""
echo [OK] PyAI window opened
exit /b 0
