@echo off
echo [INFO] Stopping novel-agent services ...

taskkill /FI "WINDOWTITLE eq agent-auth*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq agent-gateway*" /T /F >nul 2>&1

REM Kill by port (reliable when java still holds 8080/8081)
call "%~dp0kill-port.bat" 3000 8000 8080 8081 8082 8090 8091

taskkill /FI "WINDOWTITLE eq python-ai*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq dev-python-ai*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq novel-frontend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq dev-frontend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq agent-pyai*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq dev-pyai*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq dev-content*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq dev-consumer*" /T /F >nul 2>&1

timeout /t 2 /nobreak >nul
echo.
echo [INFO] Port status after stop:
netstat -ano | findstr ":3000" | findstr "LISTENING"
netstat -ano | findstr ":8000" | findstr "LISTENING"
netstat -ano | findstr ":8080" | findstr "LISTENING"
netstat -ano | findstr ":8081" | findstr "LISTENING"
netstat -ano | findstr ":8082" | findstr "LISTENING"
netstat -ano | findstr ":8090" | findstr "LISTENING"
netstat -ano | findstr ":8091" | findstr "LISTENING"
echo.
echo If lines still appear above, run check-ports.bat and taskkill /F /PID xxx
exit /b 0
