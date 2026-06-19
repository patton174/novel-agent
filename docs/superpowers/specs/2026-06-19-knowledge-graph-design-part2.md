# 模块 1：知识图谱完善 — 设计文档（册 2）

> 本册含 §4 抽取改造 + §5 前端 + §6 收尾；§1–§3 见 [册1](./2026-06-19-knowledge-graph-design.md)。

## §4 python-ai 抽取改造

### 分块抽取（替代 text[:8000]）
`extractor.extract_entities_relations(chapter_text)` 改为：
```
1. text ≤ 8000 字 → 单块抽取
2. text > 8000 → 分块：8000 字/块，滑窗重叠 1000 字（避免实体/关系跨块断裂）
3. 每块独立 LLM 抽取（_PROMPT 不变）
4. 合并各块 entities/relations（规范化去重）
```
滑窗重叠区可能重复抽取同一实体——由规范化合并解决。

### 实体名规范化 + 合并（新 `kg/normalize.py`）
```python
def normalize_name(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r'[（(].*?[)）]', '', s)   # 去括号及内容
    s = s.strip('""\'""\' `·')            # 去引号/装饰
    s = re.sub(r'\s+', '', s)             # 去所有空白
    return s

def merge_extraction(block_results: list[dict]) -> dict:
    entities, relations = {}, []
    for blk in block_results:
        for e in blk["entities"]:
            name = normalize_name(e.get("name",""))
            if not name: continue
            if name not in entities:
                entities[name] = {"name": name, "type": e.get("type","unknown"), "aliases": set()}
            orig = e.get("name","").strip()
            if orig and orig != name:
                entities[name]["aliases"].add(orig)
        for r in blk["relations"]:
            src, rel, dst = normalize_name(r.get("src","")), r.get("rel","").strip(), normalize_name(r.get("dst",""))
            if src and rel and dst and (src,rel,dst) not in [(x["src"],x["rel"],x["dst"]) for x in relations]:
                relations.append({"src":src,"rel":rel,"dst":dst})
    for e in entities.values():
        e["aliases"] = ",".join(sorted(e["aliases"])) or None
    return {"entities": list(entities.values()), "relations": relations}
```

### /internal/kg/extract 端点
```python
@internal_router.post("/kg/extract")
async def extract(body: KgExtractRequest, x_internal_service_key=Header(...)):
    _verify_internal_key(x_internal_service_key)
    try:
        result = await extract_entities_relations(body.text)  # 分块+合并+规范化
        return result
    except Exception as e:
        return {"error": "extract_failed", "detail": str(e)}
```
抽取失败返回 error，Java 侧写 kg_ingest_error。

### 增量管线改造
`ingest_queue._ingest_kg_background` 改为调 Java `POST /internal/kg/ingest-chapter`：
```python
async def _ingest_kg_background(*, novel_id, chapter_id, content):
    result = await extract_entities_relations(content)
    if result.get("error"):
        await httpx.post(f"{content_base_url}/internal/kg/error",
            json={"novelId": novel_id, "chapterId": chapter_id, "reason": result["error"]},
            headers=internal_key, timeout=5)
        return
    if not result["entities"] and not result["relations"]:
        return
    await httpx.post(f"{content_base_url}/internal/kg/ingest-chapter",
        json={"novelId": novel_id, "chapterId": chapter_id, **result},
        headers=internal_key, timeout=10)
```
python 不再写内存 dict；`_MemoryGraphStore` 保留作测试，运行期不用。

### GetCharacterGraph 工具改造
agent `GetCharacterGraph` 现读 `character_graph(novel_id, name)`（内存）。改为 HTTP 调 Java `GET /internal/kg/character-graph?novelId=&name=`（Java 查 PG 子图）。python `kg/query.py` 改为 HTTP 调用 Java。

## §5 前端

### 模态全图 `KnowledgeGraphModal.tsx`（mini 卡点击触发）
- 力导向图：d3-force + SVG（不引新包，frontend 已有 d3/gsap）
- 节点按 type 着色：character=sky、location=emerald、item=amber、faction=violet、event=rose、unknown=muted
- 交互：滚轮缩放、拖拽节点、点击节点高亮邻居 + 右侧抽屉显示实体详情（name/type/aliases/关联关系列表）
- 顶部：状态徽章（ok/partial/empty/failed）+ 实体/关系计数 + 错误数（点开看错误列表）+ "重新回填"按钮
- empty 状态：自动触发回填 + 显示进度条（轮询 progress）

### mini 卡 `KnowledgeGraphMini.tsx` 改造
- 点击整卡 → 打开模态
- 卡片显示状态点（绿=ok / 黄=partial / 灰=empty / 红=failed）

### 回填进度
- 模态内 empty/in_progress 时每 2s 轮询 `/progress`
- 进度条 `回填中 {done}/{total}`，failed 计数显示
- done → 刷新图谱

### 错误列表
- 模态"X 章失败"点击 → 展开 `/errors` 返回列表（chapterId + reason）

### API client 扩展（`api.ts` 加）
```ts
getKnowledgeGraph(novelId)                    // 现有，加 status/errorCount
backfillKnowledgeGraph(novelId)               // POST /backfill
getKnowledgeGraphProgress(novelId)            // GET /progress
getKnowledgeGraphErrors(novelId)              // GET /errors
```

### i18n
`editor:knowledgeGraph.*`（modalTitle/status labels/回填中/错误等）。

### 最小可视路径
1. 打开有 KG 的小说 → mini 卡显示图 → 点击 → 模态全图，可缩放拖拽
2. 打开无 KG 的旧小说 → mini 卡 empty → 点击 → 模态自动回填 → 进度条 → 完成显示图
3. 部分章抽取失败 → 模态显示 partial + 错误列表

## §6 安全 / 测试 / 迁移 / 文件清单 / 边界

### 安全与限制
- **鉴权**：图谱/回填/进度/错误端点走 X-User-Id + novel own 校验（`novelService.getNovel`）；`/internal/kg/*` 走 X-Internal-Service-Key
- **隔离**：KG 按 novel_id；用户只能查自己 novel 的图
- **回填防重**：Redis SETNX 锁 `kg:backfill:lock:{novelId}` TTL 30min；已存在 KG 记录不重复回填
- **LLM 耗量**：回填遍历全章节分块抽取，长小说耗 LLM——单 novel 锁 + 进度可见 + 前端明确提示"将抽取 N 章" + 可取消；不自动并发多 novel 回填
- **抽取超时**：python `/internal/kg/extract` 单块超时 90s

### DB 迁移（`V17__knowledge_graph.sql`，content 模块）
- 建 `kg_entity` + 唯一约束 + 索引
- 建 `kg_relation` + 唯一约束 + 索引
- 建 `kg_ingest_error` + 索引
- 关系用 `src_name/dst_name` 软引用实体名（不加 FK），应用层保证一致性

### 配置项
- `KG_ENABLED` 现有（python `config.py:50`），默认改 true（模块完成后启用）；Java 侧无需新配置

### 测试
- **python**：`test_kg_normalize`（规范化各用例）；`test_kg_extract_chunked`（>8000 字分块合并，mock LLM）；`test_kg_merge`（重复实体合并/aliases）；`/internal/kg/extract` 端点单测
- **Java**：`KgService` upsert（ON CONFLICT 更新 type+aliases）/查询子图/记录错误单测；`KgBackfillListener` 逐章抽取+进度+锁单测；`KnowledgeGraphClient` 改 PG 后端点单测
- **集成**：保存章节 → KG 抽取入 PG → 图谱端点返回；旧小说首次开图 → 自动回填 → 完成；部分失败 → partial + 错误列表

### 关键文件清单

**Java（novel-studio）**
- `studio-module-content`：`entity/{KgEntityEntity,KgRelationEntity,KgIngestErrorEntity}` + Repos、`service/KgService`(upsert/查询/子图/错误)、`controller/internal/InternalKgController`(/internal/kg/ingest-chapter+/character-graph+/error)、`controller/auth` 加回填/进度/错误端点（扩 AuthNovelController 或新建 AuthKgController）、`service/KnowledgeGraphClient` 改查 PG、`service/KgBackfillListener`(worker)、`MqTopic.KG_BACKFILL`+`KgBackfillMessage`
- 迁移 `V17__knowledge_graph.sql`

**python-ai**
- `app/kg/normalize.py`（规范化+合并）
- `app/kg/extractor.py` 改分块抽取
- `app/kg/store.py` 保留接口，运行期不用内存
- `app/kg/query.py` 改 HTTP 调 Java 子图
- `app/rag/ingest_queue._ingest_kg_background` 改调 Java
- `app/api/kg_routes.py` 加 `/internal/kg/extract`
- `tests/test_kg_*.py`

**前端**
- `src/components/agent/KnowledgeGraphModal.tsx`（d3-force SVG 全图）
- `KnowledgeGraphMini.tsx` 改造（点击开模态 + 状态点）
- `src/utils/api.ts` 扩展 KG 方法
- i18n `editor:knowledgeGraph.*`

### 范围边界（YAGNI，本模块不做）
- ❌ 实体别名人工编辑/合并 UI（自动合并足够）
- ❌ 跨小说 KG 聚合
- ❌ KG 时间线/版本（实体随章节演变）
- ❌ 图谱导出（PNG/JSON）
- ❌ agent 运行中写 KG
- ❌ 引入专用图库

### 风险与备注
- **回填 LLM 耗量**：100 章小说 × 分块可能数百次 LLM 调用——前端必须明确提示 + 可取消（取消 = 释放锁 + 标 failed）
- **d3-force 性能**：节点 >500 时力导向布局卡顿——限制渲染节点数（>500 只显示 top-N 度节点）+ 提示"图过大已折叠"
- **关系软引用**：实体删除时关系可能悬空——KG 不主动删实体（仅 upsert）；回填为全量重建（先清该 novel KG 再重抽）保证一致
- **回填=全量重建**：触发回填时先 `DELETE FROM kg_entity/kg_relation WHERE novel_id=` 再逐章抽取，避免旧脏数据；进行中锁防并发
