# PostgreSQL：局域网连接 + 不用 SSL

## 现象

Auth 日志里类似（中文可能乱码）：

```
no pg_hba.conf entry for host "192.168.6.24", user "postgres", database "novel_agent", no encryption
```

含义：**不是**要求你必须开 SSL，而是 PostgreSQL **还没有在 pg_hba.conf 里允许**「从该 IP、用 postgres 用户、连 novel_agent、且不走加密」这条规则。

应用侧已配置：`jdbc:postgresql://192.168.6.24:5432/novel_agent?sslmode=disable`（明确不用 SSL）。

## 放开全部 IP（仅内网 / 开发，勿用于公网生产）

在 **pg_hba.conf 末尾** 增加（保留文件里原有的 `local` 行即可）：

```
# 允许任意 IPv4 客户端，密码认证，不走 SSL
host    all    all    0.0.0.0/0    scram-sha-256
# 若需要 IPv6
host    all    all    ::/0         scram-sha-256
```

若 PostgreSQL 版本较老、认证仍是 md5，把 `scram-sha-256` 改成 `md5`。

**postgresql.conf** 中确认：

```
listen_addresses = '*'
```

保存后：

1. `pg_reload_conf()` 或 `pg_ctl reload`
2. 若刚改了 `listen_addresses`，需**重启 PostgreSQL 服务**
3. Windows 防火墙放行入站 **TCP 5432**

> 安全说明：`0.0.0.0/0` 表示所有 IP 都能尝试连接，仍需要正确密码。不要在公网暴露 5432。生产环境请改成具体网段，例如 `192.168.6.0/24`。

---

## 在 PostgreSQL 服务器上改（必做）

### 1. 找到配置文件

Windows 常见路径（版本号按实际目录改）：

```
C:\Program Files\PostgreSQL\16\data\pg_hba.conf
C:\Program Files\PostgreSQL\16\data\postgresql.conf
```

### 2. 编辑 pg_hba.conf

在文件**末尾**增加一行（按你实际客户端 IP 改）：

若 Auth 跑在 **192.168.6.24** 这台机器上、连本机 PG：

```
host    novel_agent    postgres    192.168.6.24/32    scram-sha-256
```

若 Auth 跑在**另一台**机器（例如 192.168.6.100），把 IP 改成 **Auth 那台机器的 IP**：

```
host    novel_agent    postgres    192.168.6.100/32    scram-sha-256
```

整个网段都可连（内网开发用）：

```
host    novel_agent    postgres    192.168.6.0/24    scram-sha-256
```

> `scram-sha-256` 与 PostgreSQL 14+ 默认一致；若你安装时仍是 md5，可改成 `md5`。

### 3. 确认 postgresql.conf 监听外网（如需从别机连）

```
listen_addresses = '*'
```

或至少：

```
listen_addresses = 'localhost,192.168.6.24'
```

### 4. 重载配置

管理员 CMD：

```bat
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" reload -D "C:\Program Files\PostgreSQL\16\data"
```

或：

```bat
psql -U postgres -c "SELECT pg_reload_conf();"
```

改 `listen_addresses` 后需**重启 PostgreSQL 服务**（服务管理器里重启 `postgresql-x64-16`）。

### 5. 防火墙

放行入站 **TCP 5432**（仅内网即可）。

## 验证

在 **跑 Auth 的那台机器** 上：

```bat
psql -h 192.168.6.24 -U postgres -d novel_agent
```

能进库后，再：

```bat
cd D:\ai\windows
stop-all.bat
start-auth.bat
```

日志里应出现 `Started NovelAgentAuthApplication`，Nacos 里会有 `agent-auth`。

## 小结

| 项 | 说明 |
|----|------|
| 应用是否用 SSL | **不用**，URL 已带 `sslmode=disable` |
| 要改什么 | **PostgreSQL 服务器** 的 `pg_hba.conf`（+ 必要时 `listen_addresses`） |
| 不要改什么 | 不必把 JDBC 改成 127.0.0.1，除非你刻意只本机连 |
