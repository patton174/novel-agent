# Part 1 — Java 持久化实现计划

> 主索引：[2026-06-19-knowledge-graph.md](./2026-06-19-knowledge-graph.md)
> 设计：[册1 §2/§3](../specs/2026-06-19-knowledge-graph-design.md)
> 约定：包根 `cn.novelstudio.module.content`；Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 1: V17 迁移

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V17__knowledge_graph.sql`

- [ ] **Step 1: 写迁移 SQL**

```sql
-- kg_entity: 实体（按 novel_id 隔离）
CREATE TABLE IF NOT EXISTS kg_entity (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    name        VARCHAR(120) NOT NULL,
    type        VARCHAR(32) NOT NULL,
    aliases     TEXT,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (novel_id, name)
);
CREATE INDEX IF NOT EXISTS idx_kg_entity_novel ON kg_entity (novel_id);
CREATE INDEX IF NOT EXISTS idx_kg_entity_novel_type ON kg_entity (novel_id, type);

-- kg_relation: 关系
CREATE TABLE IF NOT EXISTS kg_relation (
    id          VARCHAR(36) PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    src_name    VARCHAR(120) NOT NULL,
    rel         VARCHAR(64) NOT NULL,
    dst_name    VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (novel_id, src_name, rel, dst_name)
);
CREATE INDEX IF NOT EXISTS idx_kg_relation_novel ON kg_relation (novel_id);
CREATE INDEX IF NOT EXISTS idx_kg_relation_src ON kg_relation (novel_id, src_name);

-- kg_ingest_error: 抽取失败记录
CREATE TABLE IF NOT EXISTS kg_ingest_error (
    id          BIGSERIAL PRIMARY KEY,
    novel_id    VARCHAR(36) NOT NULL,
    chapter_id  VARCHAR(36),
    reason      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kg_ingest_error_novel ON kg_ingest_error (novel_id);
```

- [ ] **Step 2: 启动验证 Flyway 应用迁移**

`_restart-dev-stack.ps1`，查日志无 Flyway 报错；连 CN PG 确认三表（密码见 `scripts/local-cn.env`）：
```bash
PGPASSWORD=<pg-pwd> psql -h 118.89.123.201 -p 15432 -U <user> -d <db> -c "\d kg_entity" -c "\d kg_relation" -c "\d kg_ingest_error"
```

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V17__knowledge_graph.sql
git commit -m "feat(kg): V17 迁移—kg_entity/kg_relation/kg_ingest_error"
```

---

## Task 2: KgEntityEntity + Repo

**Files:**
- Create: `.../entity/KgEntityEntity.java`
- Create: `.../repository/KgEntityRepository.java`
- Test: `.../repository/KgEntityRepositoryTest.java`

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class KgEntityRepositoryTest {

    @Autowired KgEntityRepository repo;

    @Test
    void findByNovelId_returnsEntities() {
        KgEntityEntity e = new KgEntityEntity();
        e.setId("e1"); e.setNovelId("n1"); e.setName("林动"); e.setType("character");
        repo.save(e);
        List<KgEntityEntity> list = repo.findByNovelId("n1");
        assertThat(list).hasSize(1).extracting(KgEntityEntity::getName).contains("林动");
    }

    @Test
    void existsByNovelIdAndName_detects() {
        KgEntityEntity e = new KgEntityEntity();
        e.setId("e2"); e.setNovelId("n2"); e.setName("张三"); e.setType("character");
        repo.save(e);
        assertThat(repo.existsByNovelIdAndName("n2", "张三")).isTrue();
        assertThat(repo.existsByNovelIdAndName("n2", "李四")).isFalse();
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=KgEntityRepositoryTest
```

- [ ] **Step 3: 写 KgEntityEntity**

```java
package cn.novelstudio.module.content.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "kg_entity",
    uniqueConstraints = @UniqueConstraint(columnNames = {"novel_id", "name"}))
@Getter @Setter
public class KgEntityEntity {

    @Id @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "novel_id", nullable = false, length = 36)
    private String novelId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 32)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String aliases;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) id = IdWorker.nextIdStr();
        Instant now = Instant.now(); createdAt = now; updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
```

- [ ] **Step 4: 写 KgEntityRepository**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface KgEntityRepository extends JpaRepository<KgEntityEntity, String> {
    List<KgEntityEntity> findByNovelId(String novelId);
    Optional<KgEntityEntity> findByNovelIdAndName(String novelId, String name);
    boolean existsByNovelIdAndName(String novelId, String name);

    @Modifying
    @Query("DELETE FROM KgEntityEntity e WHERE e.novelId = :novelId")
    void deleteByNovelId(String novelId);
}
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=KgEntityRepositoryTest
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/KgEntityEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/KgEntityRepository.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/repository/KgEntityRepositoryTest.java
git commit -m "feat(kg): KgEntityEntity + Repository"
```

---

## Task 3: KgRelationEntity + KgIngestErrorEntity + Repos

**Files:**
- Create: `.../entity/KgRelationEntity.java`、`.../entity/KgIngestErrorEntity.java`
- Create: `.../repository/KgRelationRepository.java`、`.../repository/KgIngestErrorRepository.java`

- [ ] **Step 1: 写 KgRelationEntity**

```java
package cn.novelstudio.module.content.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "kg_relation",
    uniqueConstraints = @UniqueConstraint(columnNames = {"novel_id", "src_name", "rel", "dst_name"}))
@Getter @Setter
public class KgRelationEntity {

    @Id @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "novel_id", nullable = false, length = 36)
    private String novelId;

    @Column(name = "src_name", nullable = false, length = 120)
    private String srcName;

    @Column(nullable = false, length = 64)
    private String rel;

    @Column(name = "dst_name", nullable = false, length = 120)
    private String dstName;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) id = IdWorker.nextIdStr();
        createdAt = Instant.now();
    }
}
```

- [ ] **Step 2: 写 KgIngestErrorEntity**

```java
package cn.novelstudio.module.content.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "kg_ingest_error")
@Getter @Setter
public class KgIngestErrorEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "novel_id", nullable = false, length = 36)
    private String novelId;

    @Column(name = "chapter_id", length = 36)
    private String chapterId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
```

- [ ] **Step 3: 写 Repos**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgRelationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface KgRelationRepository extends JpaRepository<KgRelationEntity, String> {
    List<KgRelationEntity> findByNovelId(String novelId);
    List<KgRelationEntity> findByNovelIdAndSrcName(String novelId, String srcName);

    @Modifying
    @Query("DELETE FROM KgRelationEntity r WHERE r.novelId = :novelId")
    void deleteByNovelId(String novelId);
}
```

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.KgIngestErrorEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KgIngestErrorRepository extends JpaRepository<KgIngestErrorEntity, Long> {
    long countByNovelId(String novelId);
    Page<KgIngestErrorEntity> findByNovelIdOrderByCreatedAtDesc(String novelId, Pageable pageable);
}
```

- [ ] **Step 4: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/KgRelationEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/KgIngestErrorEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/KgRelationRepository.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/KgIngestErrorRepository.java
git commit -m "feat(kg): KgRelationEntity + KgIngestErrorEntity + Repos"
```

---

## Task 4: KgService（upsert/查询/子图/错误/清空）

**Files:**
- Create: `.../service/KgService.java`
- Test: `.../service/KgServiceTest.java`

> upsert：实体 ON CONFLICT 更新 type+追加 aliases；关系 ON CONFLICT DO NOTHING（用 exists 检查）；全量重建=先删该 novel entity+relation。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import cn.novelstudio.module.content.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KgServiceTest {

    @Mock KgEntityRepository entityRepo;
    @Mock KgRelationRepository relationRepo;
    @Mock KgIngestErrorRepository errorRepo;
    @InjectMocks KgService svc;

    @Test
    void upsert_newEntity_inserts() {
        when(entityRepo.findByNovelIdAndName("n1", "林动")).thenReturn(Optional.empty());
        when(entityRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        svc.upsertChapter("n1", "c1",
            List.of(Map.of("name", "林动", "type", "character")),
            List.of());
        verify(entityRepo).save(any());
    }

    @Test
    void upsert_existingEntity_mergesAliases() {
        KgEntityEntity existing = new KgEntityEntity();
        existing.setName("林动"); existing.setType("character"); existing.setAliases("林动(少年)");
        when(entityRepo.findByNovelIdAndName("n1", "林动")).thenReturn(Optional.of(existing));
        when(entityRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        svc.upsertChapter("n1", "c1",
            List.of(Map.of("name", "林动", "type", "character", "aliases", "林动(幼年)")),
            List.of());
        // aliases 应合并
        assertThat(existing.getAliases()).contains("林动(少年)").contains("林动(幼年)");
    }

    @Test
    void clearNovel_deletesEntitiesAndRelations() {
        svc.clearNovel("n1");
        verify(entityRepo).deleteByNovelId("n1");
        verify(relationRepo).deleteByNovelId("n1");
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=KgServiceTest
```

- [ ] **Step 3: 写 KgService**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.KgEntityEntity;
import cn.novelstudio.module.content.entity.KgIngestErrorEntity;
import cn.novelstudio.module.content.entity.KgRelationEntity;
import cn.novelstudio.module.content.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class KgService {

    private final KgEntityRepository entityRepo;
    private final KgRelationRepository relationRepo;
    private final KgIngestErrorRepository errorRepo;

    @Transactional
    public void upsertChapter(String novelId, String chapterId,
                              List<Map<String, String>> entities, List<Map<String, String>> relations) {
        // 实体 upsert（合并 aliases）
        for (Map<String, String> e : entities) {
            String name = e.get("name");
            if (name == null || name.isBlank()) continue;
            String type = e.getOrDefault("type", "unknown");
            String alias = e.get("aliases");
            Optional<KgEntityEntity> existing = entityRepo.findByNovelIdAndName(novelId, name);
            if (existing.isPresent()) {
                KgEntityEntity ent = existing.get();
                ent.setType(type);
                if (alias != null && !alias.isBlank()) {
                    Set<String> all = new LinkedHashSet<>();
                    if (ent.getAliases() != null) Collections.addAll(all, ent.getAliases().split(","));
                    Collections.addAll(all, alias.split(","));
                    all.removeIf(String::isBlank);
                    ent.setAliases(String.join(",", all));
                }
                entityRepo.save(ent);
            } else {
                KgEntityEntity ent = new KgEntityEntity();
                ent.setNovelId(novelId); ent.setName(name); ent.setType(type);
                ent.setAliases(alias);
                entityRepo.save(ent);
            }
        }
        // 关系 upsert（去重）
        Set<String> seenSrc = new HashSet<>();
        for (Map<String, String> r : relations) {
            String src = r.get("src"), rel = r.get("rel"), dst = r.get("dst");
            if (src == null || rel == null || dst == null) continue;
            // 用 (novelId,src,rel,dst) 唯一约束兜底；这里先查避免大量 insert 失败
            boolean exists = relationRepo.findByNovelIdAndSrcName(novelId, src).stream()
                .anyMatch(x -> rel.equals(x.getRel()) && dst.equals(x.getDstName()));
            if (exists) continue;
            KgRelationEntity rel2 = new KgRelationEntity();
            rel2.setNovelId(novelId); rel2.setSrcName(src); rel2.setRel(rel); rel2.setDstName(dst);
            relationRepo.save(rel2);
        }
    }

    @Transactional
    public void clearNovel(String novelId) {
        relationRepo.deleteByNovelId(novelId);
        entityRepo.deleteByNovelId(novelId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getGraph(String novelId) {
        List<KgEntityEntity> entities = entityRepo.findByNovelId(novelId);
        List<KgRelationEntity> relations = relationRepo.findByNovelId(novelId);
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (KgEntityEntity e : entities) {
            Map<String, Object> n = new LinkedHashMap<>();
            n.put("id", e.getName()); n.put("name", e.getName()); n.put("type", e.getType());
            if (e.getAliases() != null) n.put("aliases", e.getAliases());
            nodes.add(n);
        }
        List<Map<String, Object>> edges = new ArrayList<>();
        for (KgRelationEntity r : relations) {
            Map<String, Object> ed = new LinkedHashMap<>();
            ed.put("source", r.getSrcName()); ed.put("target", r.getDstName()); ed.put("rel", r.getRel());
            edges.add(ed);
        }
        String status = entities.isEmpty() ? "empty" : (errorRepo.countByNovelId(novelId) > 0 ? "partial" : "ok");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("enabled", true); out.put("status", status);
        out.put("nodes", nodes); out.put("edges", edges);
        out.put("errorCount", errorRepo.countByNovelId(novelId));
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> characterSubgraph(String novelId, String name) {
        // 1 跳邻居：name 的出边/入边实体
        List<KgRelationEntity> outR = relationRepo.findByNovelIdAndSrcName(novelId, name);
        Set<String> names = new LinkedHashSet<>();
        names.add(name);
        for (KgRelationEntity r : outR) names.add(r.getDstName());
        List<Map<String, Object>> nodes = new ArrayList<>();
        for (KgEntityEntity e : entityRepo.findByNovelId(novelId)) {
            if (names.contains(e.getName())) {
                Map<String, Object> n = new LinkedHashMap<>();
                n.put("id", e.getName()); n.put("name", e.getName()); n.put("type", e.getType());
                nodes.add(n);
            }
        }
        List<Map<String, Object>> edges = new ArrayList<>();
        for (KgRelationEntity r : outR) {
            Map<String, Object> ed = new LinkedHashMap<>();
            ed.put("source", r.getSrcName()); ed.put("target", r.getDstName()); ed.put("rel", r.getRel());
            edges.add(ed);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nodes", nodes); out.put("edges", edges);
        return out;
    }

    @Transactional
    public void recordError(String novelId, String chapterId, String reason) {
        KgIngestErrorEntity err = new KgIngestErrorEntity();
        err.setNovelId(novelId); err.setChapterId(chapterId); err.setReason(reason);
        errorRepo.save(err);
    }

    @Transactional(readOnly = true)
    public List<KgIngestErrorEntity> recentErrors(String novelId) {
        return errorRepo.findByNovelIdOrderByCreatedAtDesc(novelId,
            org.springframework.data.domain.PageRequest.of(0, 50)).getContent();
    }
}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=KgServiceTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/KgService.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/service/KgServiceTest.java
git commit -m "feat(kg): KgService upsert/查询/子图/错误/清空"
```

---

## Task 5: InternalKgController（/internal/kg/ingest-chapter+/character-graph+/error）

**Files:**
- Create: `.../controller/internal/InternalKgController.java`

> `/internal/**` 自动被 `InternalServiceKeyInterceptor` 鉴权，无需 per-method key。

- [ ] **Step 1: 写控制器**

```java
package cn.novelstudio.module.content.controller.internal;

import cn.novelstudio.module.content.service.KgService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/kg")
@RequiredArgsConstructor
public class InternalKgController {

    private final KgService kgService;

    @PostMapping("/ingest-chapter")
    public Map<String, Object> ingestChapter(@RequestBody Map<String, Object> body) {
        String novelId = (String) body.get("novelId");
        String chapterId = (String) body.get("chapterId");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> entities = (List<Map<String, String>>) body.get("entities");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> relations = (List<Map<String, String>>) body.get("relations");
        kgService.upsertChapter(novelId, chapterId,
            entities == null ? List.of() : entities,
            relations == null ? List.of() : relations);
        return Map.of("ok", true);
    }

    @PostMapping("/error")
    public Map<String, Object> error(@RequestBody Map<String, Object> body) {
        kgService.recordError((String) body.get("novelId"),
            (String) body.get("chapterId"), (String) body.get("reason"));
        return Map.of("ok", true);
    }

    @GetMapping("/character-graph")
    public Map<String, Object> characterGraph(@RequestParam String novelId, @RequestParam String name) {
        return kgService.characterSubgraph(novelId, name);
    }
}
```

- [ ] **Step 2: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/internal/InternalKgController.java
git commit -m "feat(kg): InternalKgController /internal/kg/ingest-chapter+/error+/character-graph"
```

---

## Task 6: KnowledgeGraphClient 改查 PG + 端点 status/errorCount

**Files:**
- Modify: `.../service/KnowledgeGraphClient.java`
- Modify: `.../service/auth/biz/AuthNovelBiz.java`（确认 knowledgeGraph 委托 KgService）

> 改 `getNovelGraph` 从 GET python → 调 `KgService.getGraph`。python `/api/kg/novels/{id}/graph` 不再被 Java 调（可保留作兼容）。

- [ ] **Step 1: KnowledgeGraphClient 改委托 KgService**

```java
package cn.novelstudio.module.content.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class KnowledgeGraphClient {

    private final KgService kgService;

    public Map<String, Object> getNovelGraph(String novelId) {
        if (novelId == null || novelId.isBlank()) {
            Map<String, Object> out = new java.util.LinkedHashMap<>();
            out.put("enabled", false); out.put("status", "empty");
            out.put("nodes", java.util.List.of()); out.put("edges", java.util.List.of());
            out.put("errorCount", 0L); out.put("note", "missing novel_id");
            return out;
        }
        return kgService.getGraph(novelId);
    }
}
```
（删除原 pythonRestClient 字段 + import；`AuthNovelBiz.knowledgeGraph` 不变，仍调 `knowledgeGraphClient.getNovelGraph`。）

- [ ] **Step 2: 编译 + 启动验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```
`_restart-dev-stack.ps1`，确认无编译/启动错误。curl 测图谱端点（无 KG 时返回 status=empty）：
```bash
curl -s -H "X-User-Id: <uid>" "http://127.0.0.1:8080/api/content/auth/novels/<novelId>/knowledge-graph"
```
Expected: `{"enabled":true,"status":"empty","nodes":[],"edges":[],"errorCount":0}`（Result 包装）。

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/KnowledgeGraphClient.java
git commit -m "feat(kg): KnowledgeGraphClient 改查 PG(KgService)，端点返回 status/errorCount"
```

---

Part 1 完成。→ 继续 [Part 2 — Java 回填](./2026-06-19-knowledge-graph-part2-java-backfill.md)
