# Skills 与 AI 提示词版本管理规范

> 2026-06-26 · 解决「官方库 + 用户自定义」双轨与代码硬编码问题

## 问题

| 现状 | 问题 |
|------|------|
| 系统 Skill 内容同时存在于 V26 SQL、`python-ai/skills/bundled/`、Python 硬编码探测 | 三处漂移，升级困难 |
| 用户 Skill 仅存 PG，`version` 乐观锁 | ✅ 已合理 |
| 封面 / 建书 LLM 系统提示词写在 Python/Java 字符串常量 | 无法热更新、无法 A/B |

## 设计原则

1. **单一权威源（SSOT）**：运行时只读 **PostgreSQL**；仓库内 Markdown 仅为**发布工件**。
2. **双轨 Skills**：`is_system=true` 官方库；`user_id` 用户自定义；同名 slug 用户不可覆盖系统。
3. **整数版本 + 乐观锁**：用户 Skill 更新带 `version`（已有）；系统 Skill 由 **catalog 声明版本**，部署 sync 时仅当 catalog.version > DB.version 才写入。
4. **提示词模板**：独立表 `ai_prompt_template`，key 命名 `domain.purpose.role`（如 `cover.prompt.structured.system`）。
5. **离线兜底**：Python 读 bundled 文件仅用于 dev / novel-studio 不可达，**禁止**在业务逻辑里写死 slug 或 prompt 正文。

## Skills 数据流

```
python-ai/skills/catalog.json          # 元数据：name, version, path
python-ai/skills/bundled/{slug}/SKILL.md
        │
        ▼  deploy / scripts/sync-system-skills.py
agent_skill (is_system=true, version INT)
        │
        ▼  GET /internal/agent/skills/{slug}
python-ai Skill 工具 / Assembler skill_prompt
        │
        ▼  用户 CRUD
agent_skill (user_id, version 乐观锁)
```

### catalog.json 示例

```json
{
  "schema_version": 1,
  "skills": [
    { "name": "fanqie-chapter-hook", "version": 1, "path": "bundled/fanqie-chapter-hook/SKILL.md" }
  ]
}
```

### 部署

Worker deploy 后执行（与 `register-frontend-crypto.sh` 同级）：

```bash
python scripts/sync-system-skills.py --base-url http://novel-studio:8080
```

`POST /internal/agent/skills/sync` 批量 upsert；仅当 catalog.version 更大或 content 变更时 bump。

## 提示词模板数据流

```
python-ai/prompts/bundled/{key}.md     # 发布工件 + dev 兜底
        │
        ▼  V29 migration seed + 未来 sync 脚本
ai_prompt_template (template_key, locale, version, content)
        │
        ▼  GET /internal/ai/prompts/{key}?locale=zh
cover_prompt.py / novel_description.py
```

### Key 约定

| Key | 用途 |
|-----|------|
| `cover.prompt.structured.system` | 封面结构化 LLM system |
| `cover.prompt.stream.system` | 封面流式 Markdown system |
| `cover.prompt.role` | 封面 Role 段（注入 structured/stream） |
| `novel.description.generate.system` | 建书从零生成 |
| `novel.description.optimize.system` | 建书优化润色 |

`fanqie_cover_spec.py` 中的**构图规则/品类映射**保留为代码（结构化配置）；仅 **LLM 自然语言 system 提示**外置。

## Run 级 pin（后续）

会话/Run 可记录 `skill_pins: [{id, version}]` 以保证长会话内 Skill 升级不中途漂移；MVP 使用解析时的最新可访问版本。

## 禁止项

- ❌ 在 Python/Java 中硬编码 Skill slug 探测可用性
- ❌ 在 Flyway 中重复粘贴大段 Skill 正文（V26 历史保留，新 Skill 只走 catalog sync）
- ❌ 在 `NovelCoverService.buildDefaultCoverPrompt` 维护英文/中文 prompt 模板（委托 python-ai + `fanqie_cover_spec` fallback）
