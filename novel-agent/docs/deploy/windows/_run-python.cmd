@echo off
call "%~dp0env.bat"
if not exist "%PROJECT_ROOT%\python-ai" (
  echo [ERROR] python-ai not found: %PROJECT_ROOT%\python-ai
  exit /b 1
)
cd /d "%PROJECT_ROOT%\python-ai"
if not exist "%~dp0logs" mkdir "%~dp0logs"
"%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> "%~dp0logs\python-ai.log" 2>&1
