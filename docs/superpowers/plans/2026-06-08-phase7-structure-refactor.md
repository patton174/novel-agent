# Phase 7 实施计划：结构工程化重构（Python 爬虫统一包 + Java 模块聚合）

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

> 目标：消除"散乱"——①把分散在 5 个顶层位置的 Python 爬虫子系统收敛为单一 `app/crawl/` 包（L2）；②Java 多模块按职责聚合：业务服务全部归入 `agent-service` 父模块，新增 `agent-document` 模块归集文档与部署脚本。
>
> 周期：约 2 周 ｜ 侧：python-ai + novel-agent ｜ 风险：**纯结构迁移，零功能变更**，回归以"行为不变 + import/构建不破"为准。
>
> **方针**：自底向上、小步迁移、每步独立回归；先 Python（已有 404 测试护栏）后 Java（聚合构建护栏）；所有迁移用 `git mv` 保留历史。

---

## 背景：散乱现状（审计依据）

### Python — 爬虫子系统切成 5 处（约 49 文件）

| 位置 | 文件数 | 内容 |
|------|--------|------|
| `app/crawl/` | 9 | engine（引擎/选择器/清洗）+ config |
| `app/crawl_agent/` | ~21 | 子 Agent：loop/context/memory/tools/prompting |
| `app/crawl_orchestrator/` | 6 | 编排 Agent：loop/client/tools/scheduler |
| `app/services/crawl_*.py` | 12 | fetch/browser/scrapling/proxy/mihomo/ai_extractor/client/goal/job_executor/agent/novel_crawler/site_resolver |
| `app/core/crawl_metrics.py` | 1 | 埋点 |

核心问题：
1. `services/` 名不副实——15 业务文件里 12 个是爬虫，仅 3 个真服务（`generation`/`agnes_image`/`cover_prompt`）。
2. **命名冲突**：`services/crawl_agent.py`（服务入口）vs `crawl_agent/`（子 Agent 包）vs `services/novel_crawler.py`（路由入口）三者相似却异层。
3. **分层割裂**：`crawl/engine/fetch_engine.py` 反向 import `app.services.crawl_*`（引擎依赖被拆到另一个顶层包）。
4. **死代码**：`services/crawl_site_resolver.py` 零引用（已用 `rg` 确认）。

### Java — 业务服务与基础模块平铺在父 pom 下

当前 `legacy/novel-agent/pom.xml` 的 `<modules>` 平铺 7 个：`agent-common`(聚合)、`agent-feign`(聚合)、`agent-gateway`、`agent-pyai`、`agent-auth`、`agent-content`、`agent-consumer`。后 5 个业务服务与基础设施模块同级，缺少"服务层"聚合；文档与部署脚本散落在 `legacy/novel-agent/agent-document/docs/`，无独立模块语义。

---

## Part A — Python 爬虫统一包（L2）

### A.1 目标结构

```
app/crawl/
  __init__.py
  config.py            # 现有
  metrics.py           # ← app/core/crawl_metrics.py
  engine/              # 现有（fetch_engine/content_extract/selectors/modes/types/html_clean）
  fetch/               # 抓取底层
    __init__.py
    fetch.py           # ← services/crawl_fetch.py
    scrapling.py       # ← services/crawl_scrapling.py
    browser.py         # ← services/crawl_browser.py
    proxy.py           # ← services/crawl_proxy.py
    mihomo.py          # ← services/crawl_mihomo.py
  extract/
    __init__.py
    ai_extractor.py    # ← services/crawl_ai_extractor.py
  client.py            # ← services/crawl_content_client.py
  goal.py              # ← services/crawl_goal.py
  job_executor.py      # ← services/crawl_job_executor.py
  runner.py            # ← services/crawl_agent.py + services/novel_crawler.py（合并入口）
  agent/               # ← crawl_agent/（整包平移）
  orchestrator/        # ← crawl_orchestrator/（整包平移）
```

迁移后 `app/services/` 仅剩：`generation.py`、`agnes_image.py`、`cover_prompt.py`、`__init__.py`。

### A.2 模块路径迁移映射（import 改写表）

| 旧路径 | 新路径 |
|--------|--------|
| `app.core.crawl_metrics` | `app.crawl.metrics` |
| `app.services.crawl_fetch` | `app.crawl.fetch.fetch` |
| `app.services.crawl_scrapling` | `app.crawl.fetch.scrapling` |
| `app.services.crawl_browser` | `app.crawl.fetch.browser` |
| `app.services.crawl_proxy` | `app.crawl.fetch.proxy` |
| `app.services.crawl_mihomo` | `app.crawl.fetch.mihomo` |
| `app.services.crawl_ai_extractor` | `app.crawl.extract.ai_extractor` |
| `app.services.crawl_content_client` | `app.crawl.client` |
| `app.services.crawl_goal` | `app.crawl.goal` |
| `app.services.crawl_job_executor` | `app.crawl.job_executor` |
| `app.services.crawl_agent` | `app.crawl.runner` |
| `app.services.novel_crawler` | `app.crawl.runner`（函数合并） |
| `app.crawl_agent`（整包） | `app.crawl.agent` |
| `app.crawl_orchestrator`（整包） | `app.crawl.orchestrator` |
| `app.services.crawl_site_resolver` | **删除** |

> 引用规模（`rg` 统计）：约 60+ 文件命中，其中 `tools/impl.py` 17 处、`tests/test_crawl_loop_integration.py` 9 处、tests 合计 ~15 文件。`scripts/probe_*.py` 亦有引用，一并改。

### A.3 执行顺序（每阶段 `git mv` → 改 import → 跑回归）

| 阶段 | 动作 | 验证 |
|------|------|------|
| A0 | 删 `services/crawl_site_resolver.py`（零引用） | `pytest tests/ -q` |
| A1 | `core/crawl_metrics.py` → `crawl/metrics.py` | 全量回归 |
| A2 | 5 个抓取底层 → `crawl/fetch/`（建 `__init__.py`） | 全量回归 |
| A3 | `crawl_ai_extractor` → `crawl/extract/ai_extractor.py` | 全量回归 |
| A4 | `crawl_content_client`/`crawl_goal`/`crawl_job_executor` → `crawl/{client,goal,job_executor}.py` | 全量回归 |
| A5 | `crawl_agent`(service)+`novel_crawler` → `crawl/runner.py`（合并 `run_crawl_agent`/`execute_crawl_job`/`preview_crawl`） | 全量回归 |
| A6 | `crawl_agent/`（整包） → `crawl/agent/`（含包内自指 import 改写） | 全量回归 |
| A7 | `crawl_orchestrator/`（整包） → `crawl/orchestrator/` | 全量回归 |

> 顺序自底向上：先无依赖的叶子（metrics/fetch/extract），再 client/goal，再上层 runner，最后两个大包。每阶段后立即 `rg "app\.services\.crawl_|app\.core\.crawl_metrics|app\.crawl_agent|app\.crawl_orchestrator"` 应逐步归零。

### A.4 验证（每阶段 + 收尾）

```bash
cd python-ai && python -m pytest tests/ -q -o "addopts="   # 全量回归（基线 404 passed）
# 静态 import 自检：确保无残留旧路径
cd python-ai && rg "app\.services\.crawl_|app\.core\.crawl_metrics|app\.crawl_agent\b|app\.crawl_orchestrator\b" app tests scripts
# 导入面冒烟：
cd python-ai && python -c "import app.main"
cd python-ai && python -c "import app.crawl.runner, app.crawl.agent.loop, app.crawl.orchestrator.loop"
```

### A.5 风险与回滚
- 风险：`crawl_agent/` 整包内部存在大量相对/绝对自指 import，改包名时易漏。对策：A6 单独成阶段，迁移后先跑 `python -c "import app.crawl.agent..."` 冒烟再跑 pytest。
- 回滚：每阶段独立 commit，失败 `git revert` 单阶段即可。

---

## Part B — Java 模块聚合（`agent-service` + `agent-document`）

### B.1 目标模块树

```
novel-agent/
  pom.xml                      # modules: agent-common, agent-feign, agent-service, agent-document
  agent-common/                # 不动
  agent-feign/                 # 不动
  agent-service/               # 新增聚合（packaging=pom，parent=novel-agent）
    pom.xml                    # modules: agent-gateway, agent-pyai, agent-auth, agent-content, agent-consumer
    agent-gateway/             # ← 平移
    agent-pyai/                # ← 平移
    agent-auth/                # ← 平移
    agent-content/             # ← 平移
    agent-consumer/            # ← 平移
  agent-document/              # 新增（packaging=pom）
    pom.xml
    docs/                      # ← legacy/novel-agent/agent-document/docs/ 全量移入
```

> **Java 包名不变**（`com.novel.agent.*`），仅 Maven 模块目录层级变化与 `<parent>` 指向调整。`dependencyManagement` 经 `agent-service → novel-agent` 继承链仍生效。

### B.2 改动清单

**B2.1 新建 `agent-service/pom.xml`**
```xml
<project ...>
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>com.novel.agent</groupId>
    <artifactId>novel-agent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
  </parent>
  <artifactId>agent-service</artifactId>
  <packaging>pom</packaging>
  <description>业务服务聚合层（gateway/pyai/auth/content/consumer）</description>
  <modules>
    <module>agent-gateway</module>
    <module>agent-pyai</module>
    <module>agent-auth</module>
    <module>agent-content</module>
    <module>agent-consumer</module>
  </modules>
</project>
```

**B2.2 父 `legacy/novel-agent/pom.xml` 的 `<modules>`**
```xml
<modules>
  <module>agent-common</module>
  <module>agent-feign</module>
  <module>agent-service</module>
  <module>agent-document</module>
</modules>
```

**B2.3 移动 5 个服务目录**（`git mv`）到 `agent-service/` 下；各服务 `pom.xml` 的 `<parent>` 改为 `agent-service`：
```xml
<parent>
  <groupId>com.novel.agent</groupId>
  <artifactId>agent-service</artifactId>
  <version>1.0.0-SNAPSHOT</version>
  <relativePath>../pom.xml</relativePath>
</parent>
```

**B2.4 新建 `agent-document/pom.xml`**（packaging=pom，纯归集，不产出运行镜像）
```xml
<project ...>
  <parent>
    <groupId>com.novel.agent</groupId>
    <artifactId>novel-agent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
  </parent>
  <artifactId>agent-document</artifactId>
  <packaging>pom</packaging>
  <description>文档与部署脚本归集（不参与服务镜像构建）</description>
</project>
```

### B.3 连带改动（高风险，必须同步）

> 部署脚本/Docker 大量**硬编码模块路径**与 `legacy/novel-agent/agent-document/docs/` 相对路径，移动后必须逐一同步，否则部署链路断裂。

| # | 文件 | 现状 | 改为 |
|---|------|------|------|
| 1 | `Dockerfile.java` | `COPY legacy/novel-agent/agent-auth ...`（5 行）；`COPY /build/novel-agent/${MODULE}/target/${JAR}` | `COPY legacy/novel-agent/agent-service/agent-auth ...`；`${MODULE}` 传 `agent-service/agent-auth`，或将 `COPY` 路径改为 `agent-service/${MODULE}` |
| 2 | `Dockerfile.java` | `mvn -pl agent-auth,agent-gateway,...` | 改用 artifactId 选择器 `-pl :agent-auth,:agent-gateway,...`（与目录层级解耦，最稳） |
| 3 | `docker-compose.mw.yml` / `docker-compose.worker.yml` | `args.MODULE: agent-auth` | 与 #1 方案一致（`agent-service/agent-auth` 或保留并由 Dockerfile 加前缀） |
| 4 | `docs/deploy/scripts/*.sh` | 内含 `legacy/novel-agent/agent-document/docs/deploy/...` 字面量 | → `legacy/novel-agent/agent-document/docs/deploy/...` |
| 5 | `docs/deploy/scripts/*.sh` | `REPO_ROOT="$SCRIPT_DIR/../../../.."`（4 层上溯） | docs 移入 agent-document 后多一层 → `../../../../..`（逐脚本核对 SCRIPT_DIR 层级！） |
| 6 | `.github/workflows/ci.yml` | java job `mvn -B verify`（working-dir `novel-agent`，无 `-pl`） | **无需改**（聚合构建自动包含新模块） |

**排查命令**：
```bash
# 模块路径引用
rg "novel-agent/agent-(auth|content|gateway|pyai|consumer)" novel-agent
# docs 相对路径引用（移入 agent-document 后全部需改）
rg "legacy/novel-agent/agent-document/docs/" -l
# 脚本内 SCRIPT_DIR 上溯层级（逐个核对）
rg "SCRIPT_DIR/\.\." novel-agent
```

### B.4 agent-document 迁移策略（二选一，执行时定夺）

- **B4-保守（低风险，推荐先行）**：仅新建 `agent-document` 模块壳并纳入父 `modules`；`docs/` 暂留原位或仅移入但**保持脚本相对路径不变的软迁移**（先不动脚本，分批迁）。优点：不破坏几十个部署脚本。
- **B4-彻底（高风险）**：物理 `git mv novel-agent/docs legacy/novel-agent/agent-document/docs`，按 B.3 #4#5 全量改脚本路径与上溯层级，逐脚本验证。需一次性完成并实跑一次部署冒烟。

### B.5 验证

```bash
cd novel-agent && mvn -B -q -DskipTests clean package   # 聚合构建通过（产物落到 agent-service/*/target）
cd novel-agent && mvn -B verify -DskipITs               # 与 CI 对齐
# 镜像构建冒烟（任一服务）
docker build --build-arg MODULE=agent-service/agent-auth --build-arg JAR=agent-auth-1.0.0-SNAPSHOT.jar \
  -f legacy/novel-agent/agent-document/docs/deploy/docker/Dockerfile.java .   # 路径按最终方案调整
```
DoD：聚合 `mvn package` 成功、5 服务 jar 各自产出、镜像构建成功、部署脚本路径自检无残留旧路径。

### B.6 风险与回滚
- 风险：B4-彻底 的脚本相对层级最易错（多一层 `agent-document`）。对策：优先 B4-保守，彻底迁移单列 PR 并部署冒烟。
- 回滚：模块移动与脚本改动分开提交；Maven 聚合若失败先回滚 pom 三处（父 modules / agent-service / 各服务 parent）。

---

## 执行总顺序与 DoD

1. **Part A（Python）** 先行——有 404 测试护栏，风险可控；A0→A7 逐阶段 commit + 回归。
2. **Part B（Java）** 后行——B2（pom 聚合 + 服务平移）→ B3（Docker/compose 路径）→ B4（agent-document，建议先保守）。
3. 每个 PR：纯结构迁移、**零功能 diff**；评审聚焦"行为不变 + 构建/导入不破"。

DoD（合并前）：
- [ ] Python：全量 `pytest` 404 绿；旧 import 路径 `rg` 归零；`import app.main` 冒烟通过。
- [ ] Java：`mvn -B verify` 绿；5 服务 jar 产出；至少一服务镜像构建冒烟通过。
- [ ] 部署脚本：模块路径与 docs 路径自检无残留；（彻底迁移时）一次部署冒烟。
- [ ] 文档：`docs/ARCHITECTURE.md` 与 `implementation-index` 同步新结构。

## 进度（实施时勾选）
### Part A — Python 爬虫统一包
- [x] A0 删 crawl_site_resolver
- [x] A1 metrics
- [x] A2 fetch/（5 底层）
- [x] A3 extract/ai_extractor
- [x] A4 client/goal/job_executor
- [x] A5 runner（合并 service 入口）
- [x] A6 crawl_agent → crawl/agent
- [x] A7 crawl_orchestrator → crawl/orchestrator

### Part B — Java 模块聚合
- [x] B2.1 新建 agent-service/pom.xml
- [x] B2.2 父 pom modules 调整
- [x] B2.3 5 服务平移 + parent 改写
- [x] B2.4 新建 agent-document 模块
- [x] B3 Docker/compose/脚本路径同步
- [x] B4 agent-document docs/scripts 迁移（**彻底**：物理移动 + 56 文件路径改写）
- [x] B5 聚合构建冒烟（`mvn -B -DskipTests clean package` 通过）

### 实施记录（2026-06-08 执行）
- Python：`pytest` **404 passed**；`import app.crawl.runner/agent/orchestrator` 冒烟通过；旧路径 `rg` 仅迁移脚本自身残留。
- Java：5 服务归入 `agent-service/`；`docs/` → `agent-document/docs/`；`Dockerfile.java` 改为 `COPY agent-service` + `-pl :artifactId` + jar 路径 `agent-service/${MODULE}/target`；部署脚本 `REPO_ROOT` 上溯层级 +1（`../../../../..` → `../../../../../..`）。
- 待远程验证：实际 `docker build` 镜像构建 + 一次 deploy-fast 冒烟（本地无 Docker 环境）。
