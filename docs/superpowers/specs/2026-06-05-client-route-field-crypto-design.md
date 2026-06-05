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

## 2. 密钥模型（推荐，优于「前端服务器注册秘钥」）

```
                    ┌─────────────────────────────────────┐
                    │           Gateway / Auth            │
                    │  密钥权威（Redis）                   │
                    │  crypto:manifest:{ver}              │
                    │  auth:aeskey:{kid}  ← 会话 SK       │
                    └──────────────▲──────────────────────┘
                                   │
         CI / deploy-fast          │  GET /api/auth/crypto-manifest
         POST /internal/crypto/    │  login/refresh → sessionCrypto
         manifest (路由表发布)      │
                                   │
                    ┌──────────────┴──────────────────────┐
                    │  Browser SPA（Worker 静态资源）      │
                    │  只拉取 manifest，不向网关「注册」密钥 │
                    └─────────────────────────────────────┘
```

### 2.1 三类密钥

| 密钥 | 来源 | 轮换 | 用途 |
|------|------|------|------|
| **Manifest 路由表** | 部署时 CI 生成并 `publish` 到 Redis | **每次前端部署** + TTL 24h |  opaque route token → 真实 path |
| **Session SK** | `login` / `refresh` 响应 `sessionCrypto` | **refresh 时自动轮换**；客户端每 23h 主动 refresh | 内层字段 k/v 加密 + 外层 AES envelope |
| **Bootstrap（可选 Phase 2）** | 网关 RSA 公钥 | 随 gateway 部署 | 登录前加密 `password` 字段 |

**不推荐**让浏览器或 Worker nginx「注册」对称密钥到网关——浏览器不可信，Worker 无长期身份。  
**推荐**：网关/Auth **签发**密钥；部署脚本 **发布路由 manifest**；浏览器 **拉取 + 缓存**。

### 2.2 客户端自动更新

1. **App 启动**：`GET /api/auth/crypto-manifest` → 缓存 `sessionStorage`（version + expiresAt）
2. **已登录**：`ensureCryptoReady()` → silent `refresh` 补 SK
3. **每 23h**（或 `manifest.expiresAt` 前）：`refreshSession()` + 若 `X-Manifest-Version` 变化则重拉 manifest
4. **前端部署后**：新版本 manifest 发布 → 旧 token 404 → 客户端强制 refetch manifest

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
