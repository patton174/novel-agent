@echo off
cd /d "%~dp0"
call _dev-env.cmd || exit /b 1
netstat -ano | findstr ":8091" | findstr "LISTENING" >nul 2>&1 && (
  echo [ERROR] Port 8091 in use. kill-port.bat 8091
  exit /b 1
)
start "dev-content" cmd /k ""%~dp0_dev-run-content.cmd""
echo [OK] Content window opened
exit /b 0
