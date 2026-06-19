# Part 2 — Java @引用 context 实现计划

> 主索引：[2026-06-19-library.md](./2026-06-19-library.md) ｜ [Part 1](./2026-06-19-library-part1-java-index.md)
> 设计：[册1 §3](../specs/2026-06-19-library-design.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 6: AgentStreamRequest + AgentRunContextDto 加 referenced_books

**Files:**
- Modify: `studio-module-agent/.../dto/agent/AgentStreamRequest.java`
- Modify: `studio-module-agent/.../dto/agent/AgentRunContextDto.java`

> 4 层镜像：AgentStreamRequest(用户请求,加 referencedBooks) + AgentRunContextDto(run context,加 referenced_books)。snake_case via @JsonNaming。注意模块3 可能已加 model_config——按现有 record 末尾追加。

- [ ] **Step 1: AgentStreamRequest 加 referencedBooks**

在 `AgentStreamRequest` record 末尾（`afterSequence` 后）加：
```java
    List<ReferencedBookRef> referencedBooks
```
+ 内嵌 record：
```java
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record ReferencedBookRef(String catalogNovelId) {}
```
（默认值 null——旧请求无该字段兼容。所有构造点需补 null/默认。`AgentStreamRequest` 是 record，Jackson 反序列化时缺字段默认 null，OK。）

- [ ] **Step 2: AgentRunContextDto 加 referenced_books**

在 `AgentRunContextDto` record 末尾（`selectedChoice` 后；模块3 可能已加 `modelConfig`）加：
```java
    List<Map<String, Object>> referencedBooks
```
（snake_case → `referenced_books`。所有构造点需补实参——`AgentRunState.toContextDto` 是唯一构造点，Task 7 处理。）

- [ ] **Step 3: 编译验证（预期 toContextDto 构造点报错，Task 7 修）**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-agent -am compile 2>&1 | tail -5
```
Expected: `AgentRunState.toContextDto` 构造缺参数编译错——Task 7 修。

- [ ] **Step 4: 提交（暂不提交，与 Task 7 一起）**

---

## Task 7: AgentContextAssembler + AgentRunState 注入 referenced_books

**Files:**
- Modify: `studio-module-agent/.../service/AgentContextAssembler.java`
- Modify: `studio-module-agent/.../orchestration/AgentRunState.java`

- [ ] **Step 1: AgentContextAssembler 写 referenced_books 入 Map**

`AgentContextAssembler.buildContext`（:63-112）内，`context.put("history", ...)` 后加：
```java
    // referenced_books：从 request 取 catalogNovelId 列表，逐本组装（摘要+章标题）
    List<Map<String, Object>> referencedBooks = new java.util.ArrayList<>();
    if (request.referencedBooks() != null) {
        for (AgentStreamRequest.ReferencedBookRef ref : request.referencedBooks()) {
            try {
                cn.novelstudio.module.content.dto.ReferencedBookDTO rb =
                    catalogService.getReferencedBook(ref.catalogNovelId(), userId);
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("catalogNovelId", rb.getCatalogNovelId());
                m.put("title", rb.getTitle());
                m.put("summary", rb.getSummary());
                m.put("chapterTitles", rb.getChapterTitles());
                m.put("namespace", rb.getNamespace());
                m.put("indexStatus", rb.getIndexStatus());
                referencedBooks.add(m);
            } catch (Exception e) {
                // 不可访问的书跳过（own 校验失败等）
            }
        }
    }
    context.put("referenced_books", referencedBooks);
```
（注入 `CatalogService catalogService`——agent 模块需依赖 content 模块。确认 agent pom 依赖 content；若否，加。`request` 是 `AgentStreamRequest`，`userId` 是 assemble 参数。）

- [ ] **Step 2: AgentRunState.toContextDto 映射 referenced_books**

`AgentRunState.toContextDto`（:80-132）加：
```java
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> referencedBooks =
            (List<Map<String, Object>>) assembledContext.get("referenced_books");
        if (referencedBooks == null) referencedBooks = java.util.List.of();
```
作为 record 末尾实参传入。

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-agent -am compile
```
Expected: PASS。

- [ ] **Step 4: 提交（Task 6+7 合并）**

```bash
git add novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/dto/agent/AgentStreamRequest.java \
        novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/dto/agent/AgentRunContextDto.java \
        novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/service/AgentContextAssembler.java \
        novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/orchestration/AgentRunState.java
git commit -m "feat(library): AgentStreamRequest/ContextDto/Assembler 注入 referenced_books"
```

---

## Task 8: AuthCatalogController /my-library/selectable + AuthCatalogBiz

**Files:**
- Modify: `.../controller/auth/AuthCatalogController.java`
- Modify: `.../service/auth/biz/AuthCatalogBiz.java`
- Modify: `.../service/catalog/CatalogService.java`（加 selectable 列表）

> @引用候选列表：我的书库（上传+收藏）书，含索引状态，供 picker 搜索。

- [ ] **Step 1: CatalogService 加 myLibrarySelectable**

```java
    public List<ReferencedBookDTO> myLibrarySelectable(Long userId, String query) {
        List<CrawlCatalogNovelEntity> all = new ArrayList<>();
        // 自己上传的（owner_id=userId, source=upload）
        all.addAll(catalogNovelRepository.findByOwnerId(userId));
        // 收藏的（user_library_collection）
        all.addAll(userLibraryCollectionRepository.findCatalogNovelsByUserId(userId));  // 需 repo 加查询
        // 去重
        Map<String, CrawlCatalogNovelEntity> uniq = new LinkedHashMap<>();
        for (CrawlCatalogNovelEntity n : all) uniq.putIfAbsent(n.getId(), n);
        return uniq.values().stream()
            .filter(n -> query == null || query.isBlank()
                || (n.getTitle() != null && n.getTitle().contains(query)))
            .map(n -> {
                ReferencedBookDTO d = new ReferencedBookDTO();
                d.setCatalogNovelId(n.getId()); d.setTitle(n.getTitle());
                d.setSummary(n.getDescription()); d.setNamespace(n.getIndexNamespace());
                d.setIndexStatus(n.getIndexStatus());
                d.setChapterTitles(List.of()); // 列表不返章节标题，详情用 getReferencedBook
                return d;
            }).toList();
    }
```
（`CrawlCatalogNovelRepository.findByOwnerId(userId)`——模块5 已加；`UserLibraryCollectionRepository.findCatalogNovelsByUserId` 需加 JOIN 查询或先查 collection 再查 novel。）

- [ ] **Step 2: AuthCatalogController 加端点**

```java
    @GetMapping("/my-library/selectable")
    public Result<List<ReferencedBookDTO>> myLibrarySelectable(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(required = false) String query
    ) {
        return biz.myLibrarySelectable(parseUserId(userId), query);
    }
```

- [ ] **Step 3: AuthCatalogBiz 加方法**

```java
    public Result<List<ReferencedBookDTO>> myLibrarySelectable(Long userId, String query) {
        return ok(catalogService.myLibrarySelectable(userId, query));
    }
```

- [ ] **Step 4: 编译 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
git add novel-studio/studio-modules/studio-module-content/
git commit -m "feat(library): /my-library/selectable @引用候选列表"
```

---

Part 2 完成。→ 继续 [Part 3 — python](./2026-06-19-library-part3-python.md)
