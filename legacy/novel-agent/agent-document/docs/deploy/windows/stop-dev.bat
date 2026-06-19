@echo off
echo [DEV] Stopping dev services ...
call "%~dp0stop-all.bat"
taskkill /FI "WINDOWTITLE eq dev-*" /T /F >nul 2>&1
exit /b 0
