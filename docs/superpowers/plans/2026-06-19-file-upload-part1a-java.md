# Part 1a — Java 后端实现计划

> 主索引：[2026-06-19-file-upload.md](./2026-06-19-file-upload.md)
> 设计：[spec](../specs/2026-06-19-file-upload-design.md)

**约定**：包根 `cn.novelstudio.module.content` 等；Java 21；`mvn -pl <module> -am test` 需 `JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试再实现。

---
---

## Task 1: DB 迁移 V15

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V15__upload_and_catalog_owner.sql`

- [ ] **Step 1: 写迁移 SQL**

```sql
-- uploaded_file: 通用文件上传元数据
CREATE TABLE IF NOT EXISTS uploaded_file (
    id               VARCHAR(36) PRIMARY KEY,
    owner_id         VARCHAR(36),
    owner_type       VARCHAR(16) NOT NULL,
    original_name    VARCHAR(255) NOT NULL,
    storage_key      VARCHAR(512) NOT NULL,
    mime_type        VARCHAR(128),
    size_bytes       BIGINT NOT NULL,
    format           VARCHAR(16) NOT NULL,
    status           VARCHAR(16) NOT NULL,
    parse_error      TEXT,
    catalog_novel_id VARCHAR(36),
    created_at       TIMESTAMPTZ NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_uploaded_file_owner ON uploaded_file (owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_uploaded_file_status ON uploaded_file (status);

-- crawl_catalog_novel: 加 owner/source/uploader_file_id
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36);
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS source VARCHAR(16) NOT NULL DEFAULT 'crawl';
ALTER TABLE crawl_catalog_novel ADD COLUMN IF NOT EXISTS uploader_file_id VARCHAR(36);
CREATE INDEX IF NOT EXISTS idx_catalog_novel_owner ON crawl_catalog_novel (owner_id, source);
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_novel_uploader_file
    ON crawl_catalog_novel (uploader_file_id) WHERE uploader_file_id IS NOT NULL;

-- plan_feature: 加 limit_value
ALTER TABLE plan_feature ADD COLUMN IF NOT EXISTS limit_value INT;

-- user_quota_override: 加 library_upload_bonus
ALTER TABLE user_quota_override ADD COLUMN IF NOT EXISTS library_upload_bonus INT;

-- seed library_upload_limit（plan_feature）
INSERT INTO plan_feature (plan_id, feature_key, enabled, limit_value)
SELECT p.id, 'library_upload_limit', TRUE, v.lim
FROM product_plan p
JOIN (VALUES ('hobby', 5), ('pro', 50)) AS v(code, lim) ON p.code = v.code
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- enterprise: 无限（limit_value NULL）
INSERT INTO plan_feature (plan_id, feature_key, enabled, limit_value)
SELECT p.id, 'library_upload_limit', TRUE, NULL
FROM product_plan p WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, feature_key) DO NOTHING;
```

- [ ] **Step 2: 启动验证 Flyway 应用迁移**

重启栈（`scripts/_restart-dev-stack.ps1`），查 novel-studio 启动日志无 Flyway 报错；连 CN PG 确认表结构：
```bash
PGPASSWORD=<cn-pg-password> psql -h 118.89.123.201 -p 15432 -U <user> -d <db> -c "\d uploaded_file"
```
（密码/库见 `scripts/local-cn.env` 的 `PG_*`）。预期：uploaded_file 表存在、crawl_catalog_novel 有 owner_id/source/uploader_file_id 列、plan_feature 有 limit_value 列。

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V15__upload_and_catalog_owner.sql
git commit -m "feat(upload): V15 迁移—uploaded_file 表 + catalog owner/source + plan_feature.limit_value"
```

---

## Task 2: UploadedFileEntity + Repo

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/UploadedFileEntity.java`
- Create: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/UploadedFileRepository.java`
- Test: `novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/repository/UploadedFileRepositoryTest.java`

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UploadedFileEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class UploadedFileRepositoryTest {

    @Autowired UploadedFileRepository repo;

    private UploadedFileEntity mk(String id, Long owner, String status) {
        UploadedFileEntity e = new UploadedFileEntity();
        e.setId(id); e.setOwnerId(owner); e.setOwnerType("user");
        e.setOriginalName("a.epub"); e.setStorageKey("2026/06/19/" + id + ".epub");
        e.setSizeBytes(100L); e.setFormat("epub"); e.setStatus(status);
        return e;
    }

    @Test
    void countActiveByOwner_countsPendingParsingReady_notFailed() {
        repo.save(mk("1", 10L, "pending"));
        repo.save(mk("2", 10L, "ready"));
        repo.save(mk("3", 10L, "failed")); // 不计
        repo.save(mk("4", 20L, "ready"));
        long n = repo.countActiveByOwner(10L);
        assertThat(n).isEqualTo(2);
    }

    @Test
    void findByOwnerIdOrderByCreatedAtDesc_filtersOwner() {
        repo.save(mk("1", 10L, "ready"));
        repo.save(mk("2", 20L, "ready"));
        List<UploadedFileEntity> list = repo.findByOwnerIdOrderByCreatedAtDesc(10L, PageRequest.of(0, 10)).getContent();
        assertThat(list).hasSize(1).extracting(UploadedFileEntity::getId).contains("1");
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=UploadedFileRepositoryTest
```
Expected: FAIL（类不存在/编译错误）。

- [ ] **Step 3: 写 UploadedFileEntity**

```java
package cn.novelstudio.module.content.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "uploaded_file")
@Getter
@Setter
public class UploadedFileEntity {

    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "owner_id", length = 36)
    private Long ownerId;              // null=公共/管理员

    @Column(name = "owner_type", nullable = false, length = 16)
    private String ownerType;          // 'user' | 'admin'

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "storage_key", nullable = false, length = 512)
    private String storageKey;

    @Column(name = "mime_type", length = 128)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Column(nullable = false, length = 16)
    private String format;             // txt|md|epub|pdf|docx

    @Column(nullable = false, length = 16)
    private String status;             // pending|parsing|ready|failed

    @Column(name = "parse_error", columnDefinition = "TEXT")
    private String parseError;

    @Column(name = "catalog_novel_id", length = 36)
    private String catalogNovelId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) id = IdWorker.nextIdStr();
        Instant now = Instant.now();
        createdAt = now; updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
```

- [ ] **Step 4: 写 UploadedFileRepository**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UploadedFileEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UploadedFileRepository extends JpaRepository<UploadedFileEntity, String> {

    @Query("""
        SELECT COUNT(e) FROM UploadedFileEntity e
        WHERE e.ownerId = :ownerId AND e.ownerType = 'user'
          AND e.status IN ('pending','parsing','ready')
        """)
    long countActiveByOwner(Long ownerId);

    Page<UploadedFileEntity> findByOwnerIdOrderByCreatedAtDesc(Long ownerId, Pageable pageable);
}
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=UploadedFileRepositoryTest
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/UploadedFileEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/UploadedFileRepository.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/repository/UploadedFileRepositoryTest.java
git commit -m "feat(upload): UploadedFileEntity + Repository（配额计数/owner 过滤）"
```

---

## Task 3: CrawlCatalogNovelEntity 扩展 + Repo

**Files:**
- Modify: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/CrawlCatalogNovelEntity.java`
- Modify: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/CrawlCatalogNovelRepository.java`

- [ ] **Step 1: 给 entity 加 3 字段**

在 `CrawlCatalogNovelEntity` 类内（`updatedAt` 字段后、`@PrePersist` 前）加：
```java
    @Column(name = "owner_id", length = 36)
    private Long ownerId;

    @Column(nullable = false, length = 16)
    private String source = "crawl";

    @Column(name = "uploader_file_id", length = 36)
    private String uploaderFileId;
```
（Lombok `@Getter @Setter` 已在类上，自动生成 getter/setter。）

- [ ] **Step 2: 给 repo 加 owner 查询**

在 `CrawlCatalogNovelRepository` 接口内加：
```java
    Page<CrawlCatalogNovelEntity> findByOwnerIdOrderByUpdatedAtDesc(Long ownerId, Pageable pageable);

    boolean existsByUploaderFileId(String uploaderFileId);

    @Query("SELECT n FROM CrawlCatalogNovelEntity n WHERE n.ownerId = :ownerId AND n.uploaderFileId = :fileId")
    java.util.Optional<CrawlCatalogNovelEntity> findByOwnerAndUploaderFile(Long ownerId, String fileId);
```
（`Pageable`/`Page` 已在文件 import；`java.util.Optional` 用全限定名或加 import。）

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```
Expected: 编译通过（实体字段与 V15 迁移列对齐，`dd-auto: validate` 不报错留待启动验证）。

- [ ] **Step 4: 启动验证 validate 不报错**

`_restart-dev-stack.ps1`，查日志无 `Schema validation` 错误。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/CrawlCatalogNovelEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/CrawlCatalogNovelRepository.java
git commit -m "feat(upload): CrawlCatalogNovelEntity 加 owner_id/source/uploader_file_id"
```

---

## Task 4: StorageBackend 抽象 + LocalDiskStorageBackend + StorageProperties

**Files:**
- Create: `novel-studio/studio-platform/studio-platform-storage/pom.xml`（新模块）
- Create: `novel-studio/studio-platform/studio-platform-storage/src/main/java/cn/novelstudio/platform/storage/StorageBackend.java`
- Create: `novel-studio/studio-platform/studio-platform-storage/src/main/java/cn/novelstudio/platform/storage/LocalDiskStorageBackend.java`
- Create: `novel-studio/studio-platform/studio-platform-storage/src/main/java/cn/novelstudio/platform/storage/StorageProperties.java`
- Test: `novel-studio/studio-platform/studio-platform-storage/src/test/java/cn/novelstudio/platform/storage/LocalDiskStorageBackendTest.java`

> 注：若不想新建 maven 模块（避免改父 pom 聚合），可改为放进 `studio-platform-web` 或 content 模块下的 `support/storage/` 子包。**采用后者更省事**——放 content 模块 `cn.novelstudio.module.content.storage`。下文按此。

修正 Files：
- Create: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/storage/StorageBackend.java`
- Create: `.../storage/LocalDiskStorageBackend.java`
- Create: `.../storage/UploadStorageProperties.java`
- Test: `.../storage/LocalDiskStorageBackendTest.java`

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import static org.assertj.core.api.Assertions.assertThat;

class LocalDiskStorageBackendTest {

    @Test
    void save_load_delete_roundtrip(@TempDir Path tmp) throws Exception {
        UploadStorageProperties props = new UploadStorageProperties();
        props.setStorageDir(tmp.toString());
        LocalDiskStorageBackend storage = new LocalDiskStorageBackend(props);
        byte[] data = "hello".getBytes();
        storage.save(new ByteArrayInputStream(data), "2026/06/19/abc.epub");
        assertThat(storage.exists("2026/06/19/abc.epub")).isTrue();
        byte[] loaded = storage.load("2026/06/19/abc.epub").readAllBytes();
        assertThat(loaded).isEqualTo(data);
        storage.delete("2026/06/19/abc.epub");
        assertThat(storage.exists("2026/06/19/abc.epub")).isFalse();
    }

    @Test
    void save_rejectsPathTraversal(@TempDir Path tmp) {
        UploadStorageProperties props = new UploadStorageProperties();
        props.setStorageDir(tmp.toString());
        LocalDiskStorageBackend storage = new LocalDiskStorageBackend(props);
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            storage.save(new ByteArrayInputStream("x".getBytes()), "../evil.txt")
        ).isInstanceOf(IllegalArgumentException.class);
    }
}
```

- [ ] **Step 2: 跑测试验证失败**（编译错误，类不存在）

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=LocalDiskStorageBackendTest
```

- [ ] **Step 3: 写 StorageBackend 接口**

```java
package cn.novelstudio.module.content.storage;

import java.io.InputStream;

public interface StorageBackend {
    void save(InputStream in, String key);
    InputStream load(String key);
    void delete(String key);
    boolean exists(String key);
}
```

- [ ] **Step 4: 写 UploadStorageProperties**

```java
package cn.novelstudio.module.content.storage;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.upload")
public class UploadStorageProperties {
    private String storageDir = "./data/uploads";
    private long maxFileSize = 50L * 1024 * 1024; // 50MB
    private java.util.List<String> allowedFormats = java.util.List.of("txt", "md", "markdown", "epub", "pdf", "docx");
}
```

- [ ] **Step 5: 写 LocalDiskStorageBackend**

```java
package cn.novelstudio.module.content.storage;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Component
public class LocalDiskStorageBackend implements StorageBackend {

    private final UploadStorageProperties props;
    private Path root;

    public LocalDiskStorageBackend(UploadStorageProperties props) {
        this.props = props;
    }

    @PostConstruct
    void init() throws Exception {
        root = Paths.get(props.getStorageDir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    private Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)) {
            throw new IllegalArgumentException("非法存储路径: " + key);
        }
        return resolved;
    }

    @Override
    public void save(InputStream in, String key) {
        try {
            Path target = resolve(key);
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            throw new RuntimeException("文件落盘失败: " + key, e);
        }
    }

    @Override
    public InputStream load(String key) {
        try {
            return Files.newInputStream(resolve(key));
        } catch (Exception e) {
            throw new RuntimeException("文件读取失败: " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (Exception e) {
            // 删除失败不阻断主流程，仅记日志
        }
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(resolve(key));
    }
}
```

- [ ] **Step 6: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=LocalDiskStorageBackendTest
```
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/storage/ \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/storage/
git commit -m "feat(upload): StorageBackend 抽象 + 本地磁盘实现（含路径穿越防护）"
```

---

## Task 5: multipart 配置

**Files:**
- Modify: `novel-studio/studio-app/src/main/resources/application.yml`

- [ ] **Step 1: 加 multipart 配置**

在 `studio-app/src/main/resources/application.yml` 的 `spring:` 块内（与 `jpa`/`flyway` 同级）加：
```yaml
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 55MB
```
并在 `app:` 块（已有 `agent:`）下加 upload 配置：
```yaml
  upload:
    storage-dir: ${UPLOAD_STORAGE_DIR:./data/uploads}
    max-file-size: 50MB
    allowed-formats: [txt, md, markdown, epub, pdf, docx]
```

- [ ] **Step 2: 启动验证配置加载**

`_restart-dev-stack.ps1`，确认无配置绑定错误。

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-app/src/main/resources/application.yml
git commit -m "feat(upload): multipart 大小限制 + app.upload 配置"
```

---

## Task 6: PlanFeatureEntity.limitValue + UserQuotaOverrideEntity.libraryUploadBonus

**Files:**
- Modify: `novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/PlanFeatureEntity.java`
- Modify: `novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/UserQuotaOverrideEntity.java`

- [ ] **Step 1: PlanFeatureEntity 加 limitValue**

在 `PlanFeatureEntity` 的 `enabled` 字段后加：
```java
    @Column(name = "limit_value")
    private Integer limitValue;   // null=不适用/布尔特性; 数值=限额
```

- [ ] **Step 2: UserQuotaOverrideEntity 加 libraryUploadBonus**

在 `UserQuotaOverrideEntity` 的 `rateLimitRpm` 字段后加：
```java
    @Column(name = "library_upload_bonus")
    private Integer libraryUploadBonus;
```

- [ ] **Step 3: 编译 + validate 验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```
`_restart-dev-stack.ps1` 确认 validate 通过（V15 已加列）。

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/PlanFeatureEntity.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/UserQuotaOverrideEntity.java
git commit -m "feat(upload): PlanFeatureEntity.limitValue + UserQuotaOverride.libraryUploadBonus"
```

---

--- Part 1a 完成。继续 [Part 1b](./2026-06-19-file-upload-part1b-java.md)。
