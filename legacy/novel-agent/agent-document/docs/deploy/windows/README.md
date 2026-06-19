# Windows local deploy

## Ports

| Service | Port | Script |
|---------|------|--------|
| Frontend (Vite) | 3000 | `start-frontend.bat` |
| Python AI | 8000 | `start-python.bat` |
| Gateway | 8080 | `start-gateway.bat` |
| Auth | 8081 | `start-auth.bat` |
| PyAI bridge | 8082 | `start-pyai.bat` |

## First time

1. Copy `env.bat.example` -> `env.bat`, set `JAVA_HOME` and **`PROJECT_ROOT`** (repo root, for python-ai + frontend).
2. Build Java JARs: `build.bat` (needs JDK 17+ and Maven).
3. Python deps once:
   ```bat
   cd %PROJECT_ROOT%\python-ai
   pip install -r requirements.txt
   ```
4. Frontend deps once:
   ```bat
   cd %PROJECT_ROOT%\frontend
   npm install
   ```
5. Nacos configs published; middleware (PG/Redis/RabbitMQ) running.

## Start commands

```bat
REM Already have auth + gateway only:
start-all.bat

REM Java only: auth + pyai + gateway (Python must run separately):
start-java.bat

REM Everything (recommended for local dev):
start-full.bat
```

Single services:

```bat
start-python.bat
start-auth.bat
start-pyai.bat
start-gateway.bat
start-frontend.bat
```

## Stop

```bat
stop-all.bat
```

Or: `kill-port.bat 3000 8000 8080 8081 8082`

## Logs

Under `logs\`: `python-ai.log`, `auth.log`, `pyai.log`, `gateway.log`, `frontend.log`

## Open app

http://localhost:3000

Frontend uses **gateway** (`VITE_DIRECT_PYTHON=false`, proxy `/api` -> `8080`).

## Deploy folder on server

Copy to e.g. `D:\ai\windows`:

- All `.bat` / `.cmd` / `env.bat`
- `dist\` three JARs
- Set `PROJECT_ROOT` in `env.bat` if Python/frontend run from another disk

## Verify

```bat
check-ports.bat
```

Login: `POST http://localhost:8080/api/auth/login`  
Agent SSE: `POST http://localhost:8080/api/agent/chat/stream`
