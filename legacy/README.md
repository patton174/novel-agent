# legacy/ — 已归档代码与部署资产

本目录归档了**已停止维护**的历史代码与部署资产，**勿在此开发新功能、勿部署其中的微服务**。

## 内容

- `legacy/novel-agent/` — 旧 Spring Cloud 微服务栈（agent-gateway / agent-auth / agent-pyai / agent-content / agent-consumer 等），已被 `novel-studio/` 单体取代。生产数据面在 [`../novel-studio/studio-modules/`](../novel-studio/studio-modules/)。

## ⚠️ 仍被活跃 CI 引用的资产（勿删）

`legacy/novel-agent/agent-document/docs/deploy/` 下的部分资产**仍被活跃 GitHub Actions 调用**，迁移时已同步改写路径：

| 资产 | 被谁调用 |
|------|----------|
| `ci/build-python-ai.sh` + `docker/Dockerfile.python-ai` | [`../.github/workflows/deploy-python-ai.yml`](../.github/workflows/deploy-python-ai.yml)、[`../.github/workflows/deploy-migrate-stack.yml`](../.github/workflows/deploy-migrate-stack.yml) |
| `docker/.env.worker` / `.env.mw` / `.env.split` | novel-studio CI（`ensure-worker-secrets.sh` 等）读取环境配置 |

镜像名（如 `novel-agent/python-ai:latest`）为 Docker image tag，**与目录路径无关**，迁移时已保持不变以兼容既有部署。

## 现状权威文档

- 协作规范：[`../CLAUDE.md`](../CLAUDE.md)
- 架构：[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)、[`../.cursor/rules/project-architecture.mdc`](../.cursor/rules/project-architecture.mdc)
- 部署：[`../novel-studio/deploy/README.md`](../novel-studio/deploy/README.md)、[`../.cursor/rules/deploy-ops.mdc`](../.cursor/rules/deploy-ops.mdc)

> 归档时间：2026-06-17（见 [`../docs/superpowers/specs/2026-06-17-doc-alignment-and-novel-agent-legacy-migration-design.md`](../docs/superpowers/specs/2026-06-17-doc-alignment-and-novel-agent-legacy-migration-design.md)）。
