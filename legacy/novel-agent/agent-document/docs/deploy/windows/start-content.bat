@echo off
cd /d "%~dp0"
call env.bat || exit /b 1
set "JAR=%~dp0dist\agent-content-1.0.0-SNAPSHOT.jar"
if not exist "%JAR%" (
  echo [ERROR] Missing %JAR%
  exit /b 1
)
set SPRING_PROFILES_ACTIVE=%SPRING_PROFILES_ACTIVE%
set NACOS_SERVER_ADDR=%NACOS_SERVER_ADDR%
set NACOS_NAMESPACE=%NACOS_NAMESPACE%
set NACOS_USERNAME=%NACOS_USERNAME%
set NACOS_PASSWORD=%NACOS_PASSWORD%
echo [RUN] content :8091
java -jar "%JAR%" --server.port=8091
