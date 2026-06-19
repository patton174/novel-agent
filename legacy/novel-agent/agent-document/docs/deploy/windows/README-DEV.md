# Local dev (no JAR) — Python / PyAI / Frontend only

**Auth + Gateway run on the server.** Do not use `start-auth-dev.bat` / `start-gateway-dev.bat` unless you stopped the server copies.

## env.bat

```bat
set PROJECT_ROOT=D:\Users\JZJ\Desktop\agent
set JAVA_HOME=D:\Programs\Java\jdk_21
set VITE_REMOTE_GATEWAY=http://192.168.6.24:8080
set VITE_LOCAL_PYAI=http://127.0.0.1:8082
```

## Start (3 windows)

```bat
start-dev.bat
```

- Python `:8000` (reload)
- PyAI `:8082` (mvn spring-boot:run)
- Frontend `:3000` — `/api/auth` -> server gateway, `/api/agent` -> local pyai

## Stop local only

```bat
kill-port.bat 3000 8000 8082
```

Do **not** kill `8080` / `8081` if the server still needs them.

## Mistaken local auth/gateway

If you already started local `:8080` / `:8081`:

```bat
kill-port.bat 8080 8081
```

## Full local stack (rare)

Only when server is **not** running auth/gateway:

```bat
start-dev-all.bat
```
