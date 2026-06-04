@echo off
call "%~dp0_dev-env.cmd" || exit /b 1
cd /d "%PROJECT_ROOT%\frontend"
set VITE_DIRECT_PYTHON=false
if defined VITE_REMOTE_AUTH (
  echo [DEV] frontend :3000 auth -^> %VITE_REMOTE_AUTH%  agent -^> %VITE_LOCAL_PYAI%
) else if defined VITE_REMOTE_GATEWAY (
  echo [DEV] frontend :3000 auth -^> %VITE_REMOTE_GATEWAY%  agent -^> %VITE_LOCAL_PYAI%
) else (
  echo [DEV] frontend :3000 all /api -^> local :8080
)
call npm run dev -- --host
