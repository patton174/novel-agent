@echo off
cd /d "%~dp0"
call "%~dp0env.bat"
if not exist "%~dp0logs" mkdir "%~dp0logs"
java %JAVA_OPTS% -jar "%~dp0dist\agent-gateway-1.0.0-SNAPSHOT.jar" >> "%~dp0logs\gateway.log" 2>&1
