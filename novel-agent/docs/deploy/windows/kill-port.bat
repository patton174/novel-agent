@echo off
setlocal EnableExtensions
REM Usage: kill-port.bat 8081
REM        kill-port.bat 8080 8081

if "%~1"=="" (
  echo Usage: kill-port.bat PORT [PORT2 ...]
  exit /b 1
)

:loop
if "%~1"=="" goto done
set "PORT=%~1"
echo [INFO] Port %PORT%:
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo   taskkill /F /PID %%p
  taskkill /F /PID %%p >nul 2>&1
)
shift
goto loop

:done
echo [OK] Done.
exit /b 0
