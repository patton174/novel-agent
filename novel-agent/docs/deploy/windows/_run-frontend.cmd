@echo off
call "%~dp0env.bat"
if not exist "%PROJECT_ROOT%\frontend" (
  echo [ERROR] frontend not found: %PROJECT_ROOT%\frontend
  exit /b 1
)
cd /d "%PROJECT_ROOT%\frontend"
if not exist "%~dp0logs" mkdir "%~dp0logs"
set VITE_DIRECT_PYTHON=false
call npm run dev -- --host >> "%~dp0logs\frontend.log" 2>&1
