# Frontend

Vite + React 小说编辑器与 AI 助手。

## 环境变量（`.env.example`）

| 变量 | 说明 |
|------|------|
| `VITE_SECURITY_AES` | AES 传输层（生产默认 true） |
| `VITE_ROUTE_OBFUSCATION` | 路由脱敏 |
| `VITE_FIELD_ENCRYPTION` | 字段 k/v 加密 |
| `VITE_CODE_OBFUSCATION` | 生产默认 true：`security` 强混淆 + 业务轻混淆；产物 `assets/[hash].js` |

本地调试可将安全相关设为 `false`；混淆可用 `VITE_CODE_OBFUSCATION=false` 关闭。

## 安全模块

| 文件 | 职责 |
|------|------|
| `src/security/secureFetch.ts` | 统一请求、AES、Sign、401 处理 |
| `src/security/requestSign.ts` | HMAC 签名（query / body） |
| `src/security/cryptoRuntime.ts` | bootstrap：`GET /api/auth/crypto-config` |
| `src/security/cryptoMaterial.ts` | session / bootstrap 密钥选择 |

## 开发

```bash
pnpm install
pnpm dev
```

**CN 全栈**（推荐）：仓库根目录 `scripts\_restart-dev-stack.ps1`。

生产部署：push `master` 触发 `deploy-frontend.yml`，或 `bash novel-studio/deploy/ci/build-frontend.sh` + `deploy-frontend.sh`。
