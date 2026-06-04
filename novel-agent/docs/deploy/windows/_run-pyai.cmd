@echo off
cd /d "%~dp0"
call "%~dp0env.bat"
if not exist "%~dp0logs" mkdir "%~dp0logs"
java %JAVA_OPTS% -jar "%~dp0dist\agent-pyai-1.0.0-SNAPSHOT.jar" >> "%~dp0logs\pyai.log" 2>&1
