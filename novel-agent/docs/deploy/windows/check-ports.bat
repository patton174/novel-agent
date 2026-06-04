@echo off
echo [INFO] Listening ports:
echo.
echo --- 3000 frontend ---
netstat -ano | findstr ":3000" | findstr "LISTENING"
echo --- 8000 python-ai ---
netstat -ano | findstr ":8000" | findstr "LISTENING"
echo --- 8080 gateway ---
netstat -ano | findstr ":8080" | findstr "LISTENING"
echo --- 8081 auth ---
netstat -ano | findstr ":8081" | findstr "LISTENING"
echo --- 8082 pyai ---
netstat -ano | findstr ":8082" | findstr "LISTENING"
echo.
echo kill: kill-port.bat 3000 8000 8080 8081 8082
pause
