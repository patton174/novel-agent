# 本地基础设施（Docker）

用 Docker 一次拉起 **PostgreSQL、Redis、RabbitMQ**（可选 **Milvus**），避免在本机单独安装各组件。

> **Windows Server 2019**：无法安装 Docker Desktop（系统版本不兼容）。请改用  
> **[README-WINDOWS-SERVER-2019.md](./README-WINDOWS-SERVER-2019.md)**（本机原生安装或远程 Docker）。

## 前置条件（Windows 10 / 11）

1. 安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. 设置里启用 **WSL 2** 后端（推荐）
3. 确保 Docker 已启动（托盘图标为 Running）
4. 若本机已占用 `5432` / `6379` / `5672`，请先停掉本机同名服务，或修改 `infra/.env` 中的端口

## 快速启动

在 **PowerShell** 中：

```powershell
cd D:\Users\JZJ\Desktop\agent\infra

# 首次：生成 .env
Copy-Item .env.example .env

# 启动核心三件套
docker compose up -d

# 查看状态
docker compose ps
```

或使用脚本：

```powershell
.\scripts\start.ps1
.\scripts\stop.ps1
```

## 服务地址

| 服务 | 地址 | 说明 |
|------|------|------|
| PostgreSQL | `localhost:5432` | 库 `novel_agent`，用户 `postgres` |
| Redis | `localhost:6379` | 密码见 `.env` 中 `REDIS_PASSWORD` |
| RabbitMQ AMQP | `localhost:5672` | 默认 `guest` / `guest` |
| RabbitMQ 管理台 | http://localhost:15672 | 同上账号 |
| Milvus（可选） | `localhost:19530` | 需 `--profile vector` |

## 可选：启动 Milvus

```powershell
docker compose --profile vector up -d
```

Python AI 环境变量：`MILVUS_HOST=localhost`，`MILVUS_PORT=19530`。

## 与 Java 本地配置对齐

`agent-auth` 的 `application-local.yml` 已默认指向上述地址与密码。若修改了 `infra/.env`，请同步设置环境变量：

```powershell
$env:DB_PASSWORD = "你的PG密码"
$env:REDIS_PASSWORD = "你的Redis密码"
$env:RABBITMQ_USERNAME = "guest"
$env:RABBITMQ_PASSWORD = "guest"
```

## 健康检查

```powershell
cd ..\novel-agent
python scripts\check_local_infra.py
```

## 常用命令

```powershell
docker compose logs -f rabbitmq
docker compose restart redis
docker compose down          # 停止并保留数据卷
docker compose down -v       # 停止并删除数据（慎用）
```

## 故障排查（Windows）

- **端口被占用**：`netstat -ano | findstr :5432`，结束占用进程或改 `.env` 端口
- **Docker 未运行**：打开 Docker Desktop 等待 Ready
- **WSL 内存不足**：Docker Desktop → Settings → Resources 调高 Memory
- **拉镜像慢**：在 Docker Desktop 配置国内镜像加速（可选）
