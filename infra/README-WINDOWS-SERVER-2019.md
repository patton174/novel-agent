# Windows Server 2019 部署说明

## 为什么 Docker Desktop 装不上？

Docker Desktop **只支持** Windows 10/11 较新版本（安装器会提示 *incompatible version of Windows*）。  
**Windows Server 2019 不在支持列表内**，这是产品限制，不是配置错误。

可选方向：

| 方案 | 难度 | 说明 |
|------|------|------|
| **A. 本机原生安装（推荐）** | 中 | 直接装 PostgreSQL / Redis / RabbitMQ，与 Java `application-local.yml` 对齐 |
| **B. 另一台 Win10/11 或 Linux 跑 Docker** | 低 | 本机只改连接地址指向那台机器 |
| **C. Server 上 Hyper-V 装 Linux 虚拟机** | 高 | 虚拟机里 `docker compose`，适合有运维经验 |

下文以 **方案 A** 为主。

---

## A. 本机原生安装（与项目默认账号一致）

目标与 `infra/.env.example` / `application-local.yml` 一致：

| 服务 | 端口 | 账号 |
|------|------|------|
| PostgreSQL | 5432 | 用户 `postgres`，密码 `changeme`，库 `novel_agent` |
| Redis | 6379 | 密码 `changeme` |
| RabbitMQ | 5672 | `guest` / `guest`，管理台 **15672** |

### 1. PostgreSQL

1. 下载：https://www.postgresql.org/download/windows/  
2. 安装时设置 **超级用户密码** = `changeme`（或自定后改 `application-local.yml`）。  
3. 安装完成后用 **pgAdmin** 或 `psql` 建库：

```sql
CREATE DATABASE novel_agent;
```

4. 若安装程序已勾选创建同名库，可跳过。

### 2. Redis（Server 上建议用 Memurai）

官方 Redis 已不维护 Windows 安装包，开发环境可用 **Memurai**（兼容 Redis 协议）：

1. 下载：https://www.memurai.com/get-memurai  
2. 安装后打开 **Memurai Developer**，设置密码 `changeme`（或在配置里 `requirepass`）。  
3. 确认监听 `6379`。

> 若你已有其他 Redis Windows 构建，只要端口 6379、密码与配置一致即可。

### 3. RabbitMQ

1. 先装 **Erlang**（与 RabbitMQ 版本匹配）：  
   https://www.erlang.org/downloads  
2. 再装 **RabbitMQ Windows 安装包**：  
   https://www.rabbitmq.com/docs/install-windows  
3. 安装目录打开 **PowerShell（管理员）**，启用管理插件：

```powershell
cd "C:\Program Files\RabbitMQ Server\rabbitmq_server-3.13.0\sbin"
# 路径里的版本号按你实际安装目录改
.\rabbitmq-plugins.bat enable rabbitmq_management
.\rabbitmq-service.bat start
```

4. 浏览器打开：**http://localhost:15672**  
   默认账号 `guest` / `guest`（仅本机开发；生产勿用默认账号）。

### 4. 验证

```powershell
cd D:\Users\JZJ\Desktop\agent\novel-agent
python scripts\check_local_infra.py
```

三项 `[OK]` 即可启动 Java 服务。

---

## B. 远程 Docker（本机是 Server 2019）

在 Win10/11 或 Linux 上：

```bash
cd infra && docker compose up -d
```

在本机 `application-local.yml` 或环境变量里把 `localhost` 改成那台机器 IP，例如：

```powershell
$env:DB_HOST = "192.168.x.x"
$env:REDIS_HOST = "192.168.x.x"
$env:RABBITMQ_HOST = "192.168.x.x"
```

防火墙需放行 5432、6379、5672。

---

## C. 使用 Chocolatey 半自动安装（Server 已装 choco 时）

以 **管理员 PowerShell** 运行：

```powershell
cd D:\Users\JZJ\Desktop\agent\infra\scripts
.\install-windows-server.ps1
```

脚本会尝试：`choco install postgresql redis-64 rabbitmq`（Erlang 由 rabbitmq 包拉取）。  
若未安装 Chocolatey：https://chocolatey.org/install  

安装后仍需按上文 **建库 `novel_agent`**、**启用 RabbitMQ 管理插件**、**设置 Redis/Memurai 密码**。

---

## 和 `infra/docker-compose.yml` 的关系

`docker-compose.yml` **仅适用于** 已安装 Docker Desktop 的 Windows 10/11 或 Linux/macOS。  
Server 2019 请用本文档，**不要**再装 Docker Desktop。
