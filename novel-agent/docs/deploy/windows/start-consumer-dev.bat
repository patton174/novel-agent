@echo off
cd /d "%~dp0"
call _dev-env.cmd || exit /b 1
netstat -ano | findstr ":8090" | findstr "LISTENING" >nul 2>&1 && (
  echo [ERROR] Port 8090 in use. kill-port.bat 8090
  exit /b 1
)
start "dev-consumer" cmd /k ""%~dp0_dev-run-consumer.cmd""
echo [OK] Consumer window opened
exit /b 0
