# Novel AI Service API 文档

## 概述

Novel AI Service 是一个小说写作 AI 助手服务，基于 FastAPI 构建，支持多种 LLM 提供者（如 OpenAI、DeepSeek、SiliconFlow、 MiniMax 等）。

**Base URL**: `http://localhost:8000`

---

## 基础信息

### 健康检查

```
GET /api/health
```

**响应示例**:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "llm_configured": true,
  "active_provider": "openai",
  "current_model": "MiniMax-M2.7-highspeed"
}
```

---

### 获取配置

```
GET /api/config
```

查看当前服务配置（API Key 已脱敏）。

**响应示例**:
```json
{
  "active_provider": "openai",
  "available_providers": ["openai", "deepseek"],
  "providers": {
    "openai": {
      "name": "openai",
      "api_key": "sk-****",
      "base_url": "https://api.minimaxi.com/v1",
      "model": "MiniMax-M2.7-highspeed",
      "max_tokens": 4096,
      "request_timeout": 30
    }
  },
  "milvus_host": "localhost",
  "milvus_port": 19530
}
```

---

### 切换 Provider

```
POST /api/config/switch?provider=openai
```

**参数**:
- `provider` (query): Provider 名称 (`openai` 或 `deepseek`)

---

## AI 生成接口

> **续写**：`/api/ai/continue` 已废弃删除。写作续写统一走 Agent 主路径（`/api/agent/*` + `SearchKnowledge` / `WriteChapter` 等工具）。

### 1. 重写段落

```
POST /api/ai/rewrite
```

根据修改指令重写指定段落，返回 3 个候选版本。

**请求体**:
```json
{
  "original_text": "原段落内容...",
  "instructions": "让语言更简洁有力",
  "novel_id": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| original_text | string | ✅ | 需要重写的原文 |
| instructions | string | ✅ | 重写指令 |
| novel_id | integer | ❌ | 小说 ID |

**响应示例**:
```json
{
  "candidates": [
    {
      "id": 1,
      "content": "重写选项1...",
      "score": null
    }
  ]
}
```

---

### 3. 生成大纲

```
POST /api/ai/outline
```

根据一句话简介生成小说大纲。

**请求体**:
```json
{
  "summary": "一个平凡少年获得上古传承，从此踏上修仙之路...",
  "genre": "玄幻",
  "style": "爽文"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| summary | string | ✅ | 一句话小说简介 |
| genre | string | ❌ | 小说类型（都市/玄幻/科幻/悬疑/古言） |
| style | string | ❌ | 写作风格（爽文/文青/严谨/轻松） |

**响应示例**:
```json
{
  "outline": "# 三幕结构\n\n## Act 1 - 设定\n...",
  "structure": null
}
```

---

### 4. 生成对话

```
POST /api/ai/dialogue
```

生成两个角色之间的对话。

**请求体**:
```json
{
  "character_a": "张无忌",
  "character_b": "赵敏",
  "scene": "绿柳山庄地下密室",
  "context": "张无忌误闯绿柳山庄，遇见赵敏...",
  "novel_id": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| character_a | string | ✅ | 第一个角色名 |
| character_b | string | ✅ | 第二个角色名 |
| scene | string | ✅ | 场景描述 |
| context | string | ❌ | 补充上下文 |
| novel_id | integer | ❌ | 小说 ID |

**响应示例**:
```json
{
  "dialogue": "张无忌皱眉道：\"姑娘究竟是谁？\"\n\n赵敏轻笑：\"你猜。\"..."
}
```

---

### 5. 智能审校

```
POST /api/ai/review
```

AI 辅助校对，识别文本问题并提供修改建议。

**请求体**:
```json
{
  "content": "需要审校的文本内容...",
  "focus_areas": ["语法", "逻辑"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | ✅ | 要审校的文本 |
| focus_areas | string[] | ❌ | 重点关注领域 |

**响应示例**:
```json
{
  "issues": [],
  "suggestions": [
    "建议：将\"他迅速的奔跑\"改为\"他快速地奔跑\"",
    "建议：第三段对话略显冗长，可适当精简"
  ],
  "overall_quality": null
}
```

---

## 配置说明

### 环境变量 (.env)

```bash
# 当前激活的 Provider
ACTIVE_PROVIDER=openai

# OpenAI 兼容配置 (支持任意 OpenAI-compatible API)
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.minimaxi.com/v1    # 留空则使用官方 API
OPENAI_MODEL=MiniMax-M2.7-highspeed
OPENAI_MAX_TOKENS=4096
OPENAI_TIMEOUT=30

# DeepSeek 配置
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Milvus 向量数据库 (可选，暂未启用)
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

### 支持的 Provider 类型

| Provider | Base URL 示例 | Model 示例 |
|----------|--------------|-----------|
| OpenAI (官方) | `https://api.openai.com/v1` | `gpt-4o` |
| DeepSeek (官方) | `https://api.deepseek.com` | `deepseek-chat` |
| MiniMax | `https://api.minimaxi.com/v1` | `MiniMax-M2.7-highspeed` |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
| 自定义代理 | `http://your-proxy:8080/v1` | 任意模型 |

---

## 错误处理

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 502 | AI 服务调用失败 |
| 503 | LLM 未配置 |

**错误响应示例**:
```json
{
  "detail": "AI service error: LLM call failed: ..."
}
```

---

## 启动服务

```bash
cd python-ai
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

访问 `http://localhost:8000/docs` 查看交互式 API 文档。