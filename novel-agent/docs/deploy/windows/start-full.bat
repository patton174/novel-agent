@echo off
cd /d "%~dp0"
echo [INFO] Full stack: Python 8000 -^> Auth 8081 -^> PyAI 8082 -^> Gateway 8080 -^> Frontend 3000
echo.

call "%~dp0start-python.bat"
if errorlevel 1 exit /b 1
timeout /t 6 /nobreak >nul

call "%~dp0start-auth.bat"
if errorlevel 1 exit /b 1
timeout /t 10 /nobreak >nul

call "%~dp0start-pyai.bat"
if errorlevel 1 exit /b 1
timeout /t 6 /nobreak >nul

call "%~dp0start-gateway.bat"
if errorlevel 1 exit /b 1
timeout /t 6 /nobreak >nul

call "%~dp0start-frontend.bat"
exit /b %ERRORLEVEL%
