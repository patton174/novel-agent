@echo off
cd /d "%~dp0"
if exist env.bat (
  echo env.bat already exists.
  exit /b 0
)
copy /Y env.bat.example env.bat
echo [OK] Created env.bat - please edit JAVA_HOME and Nacos settings.
exit /b 0
