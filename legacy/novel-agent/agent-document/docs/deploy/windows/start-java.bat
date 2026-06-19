@echo off
REM Auth + Gateway + PyAI (no Python / no frontend)
cd /d "%~dp0"

call "%~dp0start-auth.bat"
if errorlevel 1 exit /b 1
timeout /t 10 /nobreak >nul

call "%~dp0start-pyai.bat"
if errorlevel 1 exit /b 1
timeout /t 6 /nobreak >nul

call "%~dp0start-gateway.bat"
exit /b %ERRORLEVEL%
