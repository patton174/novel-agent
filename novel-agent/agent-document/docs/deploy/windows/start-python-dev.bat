@echo off
cd /d "%~dp0"
call _dev-env.cmd || exit /b 1
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1 && (
  echo [ERROR] Port 8000 in use. kill-port.bat 8000
  exit /b 1
)
start "dev-python-ai" cmd /k ""%~dp0_dev-run-python.cmd""
echo [OK] Python window opened
exit /b 0
