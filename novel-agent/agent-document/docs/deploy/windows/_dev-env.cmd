@echo off
if not exist "%~dp0env.bat" (
  echo [ERROR] Copy env.bat.example to env.bat first.
  exit /b 1
)
call "%~dp0env.bat"
if not defined PROJECT_ROOT (
  echo [ERROR] Set PROJECT_ROOT in env.bat
  exit /b 1
)
if not defined SPRING_PROFILES_ACTIVE set SPRING_PROFILES_ACTIVE=local
set "NOVEL_AGENT_DIR=%PROJECT_ROOT%\novel-agent"
if not exist "%NOVEL_AGENT_DIR%\pom.xml" (
  echo [ERROR] novel-agent not found: %NOVEL_AGENT_DIR%
  exit /b 1
)
set "PATH=%JAVA_HOME%\bin;%PATH%"
exit /b 0
