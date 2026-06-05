# 客户端路由脱敏 + 字段/值加密 + 密钥轮换

> 日期：2026-06-05  
> 状态：**Phase 0e 设计**  
> 依赖：Phase 0c AES 传输层（`RequestCryptoEnvelope`）

## 1. 目标

| 能力 | DevTools 可见 | 说明 |
|------|---------------|------|
| **路由脱敏** | `/api/x/r7a3f9b2` 而非 `/api/content/novels` | 网关还原真实路径 |
| **字段名加密** | 无明文 `username`/`password` | 内层 JSON 的 key 密文 |
| **字段值加密** | 无明文业务值 | 内层 JSON 的 value 密文 |
| **传输层 AES** | `{v,kid,iv,ct}` envelope | 已有 Phase 0c |

**非目标**：替代 HTTPS；防不住完全逆向的前端（仍抬高爬虫/脚本成本）。

## 2. 密钥模型（你的方案）

> Worker **每日脚本**向后端注册 → 密钥写入 **Worker 本机 `.env.worker`** + `crypto-runtime.json` → 浏览器读 runtime、**失败/失效热更并静默重试**。

```
Worker cron / deploy
  register-frontend-crypto.sh
    → POST MW Auth /internal/crypto/register-frontend-server
    → 更新 Worker .env.worker (FRONTEND_CRYPTO_KEY_*)
    → docker cp crypto-runtime.json → nginx 静态目录

Browser
  GET /crypto-runtime.json（同源，Worker 刚更新的文件）
  失败 / kid 失效 → invalidateCryptoRuntime() → 静默重试 1 次
  兜底 GET /api/auth/crypto-config
```

| 步骤 | 执行者 | 动作 |
|------|--------|------|
| 注册 | Worker 脚本 | 每日向后端要新密钥 |
| 落盘 | Worker 脚本 | 写入 **Worker** env + runtime.json（不是 MW env） |
| 使用 | 浏览器 | 读 runtime，加密请求 |
| 轮换 | 失败/过期 | 热拉新密钥 + 静默重试 |

Worker cron：`0 3 * * * bash .../register-frontend-crypto.sh`

## 3. 协议

### 3.1 路由脱敏

- 客户端：`POST /api/x/{routeToken}`（GET 同理）
- 网关 `RouteObfuscationFilter`（order -115）：查 manifest → `mutate().path(realPath)`

Manifest 示例：

```json
{
  "version": 12,
  "expiresAtEpochMs": 1717586400000,
  "routes": {
    "r7a3f9b2": { "method": "POST", "path": "/api/content/novels" },
    "r8b4c1d0": { "method": "GET", "path": "/api/content/novels" }
  }
}
```

`routeToken = "r" + base64url(sha256(method + path + version)).slice(0,7)`

### 3.2 内层字段加密（在 AES envelope 解密之后）

```json
{
  "__sec": 1,
  "e": [
    { "k": "<b64 AES-GCM(fieldName)>", "v": "<b64 AES-GCM(jsonValue)>" }
  ]
}
```

网关 `FieldPayloadExpandFilter`（order -107）→ 还原为普通 JSON 再转发 Auth/Content。

### 3.3 豁免（仍走 TLS）

- `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` — 无 SK 前无法字段加密；login 的 password 可走 Bootstrap RSA（Phase 2）
- `/api/auth/crypto-manifest` — 明文 manifest（仅 opaque id，无业务数据）
- SSE stream — 默认不字段加密（与 Phase 0c 一致）

### 3.4 过滤器顺序

```
-115 RouteObfuscation
-110 Csrf
-108 RequestDecrypt（外层 AES）
-107 FieldPayloadExpand（内层 k/v）
-106 ReplayGuard
-100 Auth
 ...
```

## 4. 部署

```bash
# 生成 + 发布 manifest（frontend 部署后执行）
python novel-agent/scripts/generate_crypto_manifest.py
python novel-agent/scripts/publish_crypto_manifest.py   # → Redis + Auth internal API
```

`deploy-fast.sh frontend worker` 末尾自动调用上述脚本。

## 5. Feature flags

```yaml
auth:
  client-security:
    route-obfuscation: true
    field-encryption: true
```

前端：`VITE_ROUTE_OBFUSCATION` / `VITE_FIELD_ENCRYPTION`（生产默认 true，与 AES 一致）

## 6. 实施阶段

- **0e-a**（本 PR）：manifest + 路由脱敏 + 字段 k/v + 部署发布脚本
- **0e-b**：login password RSA bootstrap
- **0e-c**：响应体字段加密（双向）
