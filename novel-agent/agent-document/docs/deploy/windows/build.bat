@echo off
setlocal
cd /d "%~dp0"

if not exist "%~dp0env.bat" (
  echo [ERROR] Copy env.bat.example to env.bat and set JAVA_HOME first.
  exit /b 1
)
call "%~dp0env.bat"

java -version 2>&1 | findstr /C:"17." /C:"21." /C:"22." /C:"23." /C:"24." /C:"25." >nul
if errorlevel 1 (
  echo [ERROR] JDK 17+ required. Check JAVA_HOME in env.bat
  java -version
  exit /b 1
)

set "ROOT=%~dp0..\..\.."
cd /d "%ROOT%"
echo [INFO] Building in %CD%

call mvn -pl agent-auth,agent-gateway,agent-pyai,agent-content,agent-consumer -am clean package -DskipTests
if errorlevel 1 (
  echo [ERROR] Maven build failed
  exit /b 1
)

set "DIST=%~dp0dist"
if not exist "%DIST%" mkdir "%DIST%"

copy /Y "agent-auth\target\agent-auth-1.0.0-SNAPSHOT.jar" "%DIST%\"
copy /Y "agent-gateway\target\agent-gateway-1.0.0-SNAPSHOT.jar" "%DIST%\"
copy /Y "agent-pyai\target\agent-pyai-1.0.0-SNAPSHOT.jar" "%DIST%\"
copy /Y "agent-content\target\agent-content-1.0.0-SNAPSHOT.jar" "%DIST%\"
copy /Y "agent-consumer\target\agent-consumer-1.0.0-SNAPSHOT.jar" "%DIST%\"

echo.
echo [OK] JAR files copied to %DIST%
echo     agent-auth-1.0.0-SNAPSHOT.jar
echo     agent-gateway-1.0.0-SNAPSHOT.jar
echo     agent-pyai-1.0.0-SNAPSHOT.jar
echo     agent-content-1.0.0-SNAPSHOT.jar
echo     agent-consumer-1.0.0-SNAPSHOT.jar
endlocal
exit /b 0
