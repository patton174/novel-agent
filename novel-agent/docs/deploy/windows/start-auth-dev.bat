@echo off
cd /d "%~dp0"
call _dev-env.cmd || exit /b 1
netstat -ano | findstr ":8081" | findstr "LISTENING" >nul 2>&1 && (
  echo [ERROR] Port 8081 in use. kill-port.bat 8081
  exit /b 1
)
start "dev-auth" cmd /k ""%~dp0_dev-run-auth.cmd""
echo [OK] Auth window opened
exit /b 0
