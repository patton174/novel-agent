@echo off
cd /d "%~dp0"

call "%~dp0start-auth.bat"
if errorlevel 1 exit /b 1

echo [INFO] Waiting 8 seconds for auth ...
timeout /t 8 /nobreak >nul

call "%~dp0start-gateway.bat"
exit /b %ERRORLEVEL%
