# 文档对齐与 novel-agent 归档迁移 设计

> 状态：已确认范围与策略。本 spec 是实现前固化设计。
> 日期：2026-06-17

## 1. 背景

项目正处于「Spring Cloud 微服务 → novel-studio 单体」迁移收尾期。`.cursor/rules/project-architecture.mdc`、`deploy-ops.mdc`、`CLAUDE.md` 已对齐单体现状，但以下文档/资产仍描述旧微服务：

- 根 `README.md`：架构图为微服务（PyAI:8082 / Content:8091 / Consumer:8090 / Gateway:8080），仍推荐 `restart-dev.sh`。
- `docs/ARCHITECTURE.md`（2026-06-07 版）：整篇描述旧微服务，端口表、Python 路径 `agent_step/`（实际 `agent/`）全过期。
- `python-ai/AGENTS.md`：引用 `app/agent_step/`（实际 `app/agent/`）、`tool_result_routing.py` 路径过期。
- `docs/superpowers/specs|plans/` 下 ~20 篇点时设计引用旧微服务。
- `novel-agent/` 整树（旧微服务源码 + 部署脚本）：已被 novel-studio 取代，但其 `agent-document/docs/deploy/ci/` 与 `docker/` 脚本**仍被活跃 workflow `deploy-python-ai.yml` / `deploy-migrate-stack.yml` 调用**。

## 2. 目标

1. 权威活文档对齐 novel-studio 单体现状。
2. 历史规格加废弃横幅（不改内容）。
3. `novel-agent/` 迁移到 `legacy/novel-agent/`，并改写所有 CI/脚本/文档引用，保持 `deploy-python-ai.yml` 部署链不断。

## 3. 非目标

- 不动 `novel-studio/`、`python-ai/`、`frontend/` 的代码。
- 不重写历史规格内容（仅加横幅）。
- 不删除 `legacy/novel-agent/`（保留 git 历史可追溯）。
- 不改线上部署逻辑本身，仅改路径引用。

## 4. 设计

### Phase A — 权威活文档对齐

**A1. 根 `README.md`**
- 架构图：`Frontend :3000 → novel-studio :8080 → python-ai :8000`；MW（entry-nginx + PG/Redis/RabbitMQ）。
- 删除微服务端口表与目录映射里的微服务项。
- 本地开发：删除 `restart-dev.sh` 推荐；改为「仅前端 `npm run dev` / 全栈验收走 https://www.novel-agent.cn」。
- 部署段：列出 CI workflows（deploy-novel-studio / python-ai / frontend / mw-*）。
- 安全能力段：保留（Phase 0e 能力表）。
- 密钥段：保留并补充「勿连生产 MQ」禁忌。

**A2. `docs/ARCHITECTURE.md`** — 整篇对齐：
- §2 仓库结构：`novel-studio/` 单体为主；`novel-agent/` 标注 legacy。
- §3 拓扑：单体端口表（novel-studio:8080 / python-ai:8000 / frontend:3000）。
- §4 主链路：入口类指 `studio-module-agent`（AgentStreamController、AgentRunCoordinator 等）；Python 路径 `app/agent/`（非 `agent_step/`）。
- §5 子系统：用 `studio-module-auth/content/agent/billing/worker` 替换 agent-pyai/content/consumer。
- §6 VFS：`app/agent/backend/chapter_store.py`、`memory_store.py`。
- §7 工具清单：与 AGENTS.md 领域工具对齐。
- §11 爬虫：`app/crawl/`。
- 版本号 → 2026-06-17。

**A3. `python-ai/AGENTS.md`** — 修正路径：
- `app/agent_step/` → `app/agent/`。
- `tool_result_routing.py` → `app/agent/harness/tool_result_routing.py`。
- 逐条核对所列模块路径真实存在；不存在则删除或更正。

### Phase B — 历史规格加废弃横幅

对 `docs/superpowers/specs/` 与 `docs/superpowers/plans/` 下**确实引用旧微服务**的点时文档，顶部加：

> ⚠️ 历史设计记录（YYYY-MM-DD）。生产已迁移至 novel-studio 单体，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，勿据以部署。

- 已准确的文档不加横幅。
- `docs/2026-06-07-architecture-upgrade.md`（迁移计划本身）加横幅说明其为迁移记录。

### Phase C — `novel-agent/` → `legacy/novel-agent/` 迁移

> 承重细节：`agent-document/docs/deploy/ci/_common.sh:7` 用相对层级算 `REPO_ROOT`：
> `REPO_ROOT="$(cd "$CI_DIR/../../../../.." && pwd)"`（当前 5 级上 = 仓库根）。
> 迁移后 `ci/` 多一层，必须改 6 级 `../../../../../../..`，否则所有脚本 REPO_ROOT 落到 `legacy/`。

步骤：
1. `git mv novel-agent legacy/novel-agent`。
2. `_common.sh`：REPO_ROOT 层级 5 → 6。
3. 改写脚本内 `$REPO_ROOT/novel-agent/` → `$REPO_ROOT/legacy/novel-agent/`：build-java.sh、build-python-ai.sh、deploy-frontend.sh、deploy-java.sh、deploy-python-ai.sh 及 `scripts/*.sh` 内引用。
4. 改写 `.github/workflows/*.yml`：路径过滤器与 `run:` 步骤。
   - **活跃**：deploy-python-ai.yml、deploy-migrate-stack.yml。
   - **废弃但存在**：deploy-content.yml、deploy-gateway.yml（一并改）。
5. 新增 `legacy/README.md`：说明归档树 + `deploy/ci` 脚本仍被 deploy-python-ai.yml 使用，勿删。
6. 更新 `CLAUDE.md`（行 75 `check_local_infra.py`、行 113 deploy README 路径）与根 `README.md` 引用。
7. `.idea/*.xml`：更新路径。
8. `legacy/novel-agent/` 顶层文档加废弃横幅。

## 5. 验证

- `grep -rn "novel-agent/" .`（排除 legacy/ 自身、.git/、node_modules/）应为空或仅历史文档合法提及。
- `bash -n` 语法校验所有改写脚本。
- `_common.sh` 的 REPO_ROOT 计算用 `cd` 实测落地仓库根。
- CI 无法本地全跑；`deploy-python-ai.yml` 路径错误是最高风险点，需触发一次 python-ai 部署确认绿（线上，归 CI/用户执行）。

## 6. 风险与边界

- 跨 Python+Java+CI+文档多文件重构 → 按 CLAUDE.md 走 CI 全量部署。
- `deploy-python-ai.yml` 路径错误最高风险，单独验证。
- 仅动文档 + legacy 迁移 + CI 路径，不动业务代码。
- 分两次提交：先 A+B（文档对齐），再 C（迁移），降低风险与回滚成本。
