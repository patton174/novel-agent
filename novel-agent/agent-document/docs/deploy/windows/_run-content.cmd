@echo off
call "%~dp0env.bat" || exit /b 1
set "JAR=%~dp0dist\agent-content-1.0.0-SNAPSHOT.jar"
if not exist "%JAR%" (
  echo [ERROR] Missing %JAR%
  exit /b 1
)
echo [RUN] content :8091 profile=%SPRING_PROFILES_ACTIVE%
java -jar "%JAR%" --server.port=8091
