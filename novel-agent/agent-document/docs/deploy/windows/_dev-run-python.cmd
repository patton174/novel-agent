@echo off
call "%~dp0_dev-env.cmd" || exit /b 1
cd /d "%PROJECT_ROOT%\python-ai"
echo [DEV] python-ai :8000 --reload
"%PYTHON_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
