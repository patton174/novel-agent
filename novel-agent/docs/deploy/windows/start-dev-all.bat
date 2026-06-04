@echo off
REM Full local stack including auth+gateway — only if server is NOT running them.
cd /d "%~dp0"
call start-python-dev.bat
timeout /t 5 /nobreak >nul
call start-auth-dev.bat
timeout /t 12 /nobreak >nul
call start-pyai-dev.bat
timeout /t 6 /nobreak >nul
call start-gateway-dev.bat
timeout /t 6 /nobreak >nul
call start-frontend-dev.bat
exit /b 0
