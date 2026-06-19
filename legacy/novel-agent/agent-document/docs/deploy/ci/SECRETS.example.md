# GitHub Actions 部署 Secrets

在仓库 **Settings → Secrets and variables → Actions** 配置：

| Secret | 说明 |
|--------|------|
| `DEPLOY_SSH_KEY` | 能 `root@MW` / `root@Worker` 登录的私钥全文 |
| `MW_HOST` | 中间件机 IP，如 `107.150.112.140` |
| `WORKER_HOST` | 业务机 IP，如 `47.80.80.224` |

可选 Variables（一般不必设，脚本有默认值）：

| Variable | 默认 |
|----------|------|
| `MW_REMOTE_DIR` | `/opt/novel-agent` |
| `WORKER_REMOTE_DIR` | `/opt/novel-agent` |

**不要**把以下放进 GitHub，保留在服务器 `docker/.env.mw` / `.env.worker` / `.env.split`：

- `JWT_SECRET`、`AGENT_INTERNAL_SERVICE_KEY`
- `NACOS_PASSWORD`、`SPRING_DATASOURCE_PASSWORD`
- `SPRING_DATA_REDIS_PASSWORD`、`SPRING_RABBITMQ_PASSWORD`
- `MAILTRAP_TOKEN`、`AUTH_EMAIL_LINK_SECRET`
- `python-ai/.env` 中的 API Key

手动触发单服务部署：

```bash
gh workflow run deploy-gateway.yml
gh workflow run deploy-auth.yml
gh workflow run deploy-frontend.yml
```
