# Frontend

Vite + React 小说编辑器与 AI 助手。

## 环境变量（`.env.example`）

| 变量 | 说明 |
|------|------|
| `VITE_SECURITY_AES` | AES 传输层（生产默认 true） |
| `VITE_ROUTE_OBFUSCATION` | 路由脱敏 |
| `VITE_FIELD_ENCRYPTION` | 字段 k/v 加密 |
| `VITE_CODE_OBFUSCATION` | JS 混淆（Terser + javascript-obfuscator） |

本地调试可将上述设为 `false`。

## 安全模块

| 文件 | 职责 |
|------|------|
| `src/security/secureFetch.ts` | 统一请求、AES、Sign、401 处理 |
| `src/security/requestSign.ts` | HMAC 签名（query / body） |
| `src/security/authSession.ts` | Session 过期跳转 |
| `src/security/cryptoMaterial.ts` | 密钥与 runtime |

## 开发

```bash
pnpm install
pnpm dev
```

生产构建见 `novel-agent/agent-document/docs/deploy/scripts/deploy-fast.sh frontend worker`。
