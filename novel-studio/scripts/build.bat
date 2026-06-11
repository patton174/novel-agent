@echo off
setlocal
if not defined JAVA_HOME set "JAVA_HOME=D:\Programs\Java\jdk_21"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0.."
call mvn -pl studio-app -am package -DskipTests %*
if errorlevel 1 exit /b 1
echo.
echo Built: studio-app\target\studio-app-0.1.0-SNAPSHOT.jar
echo Run:   java -jar studio-app\target\studio-app-0.1.0-SNAPSHOT.jar
