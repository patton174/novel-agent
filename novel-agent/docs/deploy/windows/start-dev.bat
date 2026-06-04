@echo off
REM Local dev: Python + PyAI + Content + Consumer + Frontend
REM Auth/Gateway on server - do not start here

cd /d "%~dp0"
echo [DEV] python :8000 + pyai :8082 + content :8091 + consumer :8090 + frontend :3000
echo [DEV] auth use server :8081 - set VITE_REMOTE_AUTH in env.bat
echo.

call "%~dp0start-python-dev.bat"
if errorlevel 1 exit /b 1
timeout /t 5 /nobreak >nul

call "%~dp0start-pyai-dev.bat"
if errorlevel 1 exit /b 1
timeout /t 6 /nobreak >nul

call "%~dp0start-content-dev.bat"
if errorlevel 1 exit /b 1
timeout /t 3 /nobreak >nul

call "%~dp0start-consumer-dev.bat"
if errorlevel 1 exit /b 1
timeout /t 3 /nobreak >nul

call "%~dp0start-frontend-dev.bat"
echo.
echo [OK] http://localhost:3000
exit /b 0
