@echo off
REM Run on server (192.168.6.24) to check auth vs gateway. 503 on :8080 = route/Nacos, not network.
setlocal EnableExtensions

echo [1] Auth direct 127.0.0.1:8081
curl -s -o NUL -w "  HTTP %%{http_code}\n" --connect-timeout 3 -X POST http://127.0.0.1:8081/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"_probe\",\"password\":\"_probe\"}"

echo [2] Gateway 127.0.0.1:8080
curl -s -o NUL -w "  HTTP %%{http_code}\n" --connect-timeout 3 -X POST http://127.0.0.1:8080/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"_probe\",\"password\":\"_probe\"}"

echo.
echo 8081=200/400/401 means Auth OK. 8080=503 means gateway route has no backend (fix Nacos or uri in agent-gateway.yaml).
exit /b 0
