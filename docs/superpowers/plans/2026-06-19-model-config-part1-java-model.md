# Part 1 — Java 模型目录实现计划

> 主索引：[2026-06-19-model-config.md](./2026-06-19-model-config.md)
> 设计：[册1 §2](../specs/2026-06-19-model-config-design.md)
> 约定：包根 `cn.novelstudio.module.content` 等；Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 1: AuthRoleSupport（admin 角色门，模块5 共用）

**Files:**
- Create: `novel-studio/studio-platform/studio-platform-web/src/main/java/cn/novelstudio/platform/web/AuthRoleSupport.java`
- Test: `novel-studio/studio-platform/studio-platform-web/src/test/java/cn/novelstudio/platform/web/AuthRoleSupportTest.java`

> codebase 无 `@PreAuthorize`/SecurityFilterChain；`X-User-Roles` 头由 `AuthUserIdInjectFilter` 从 JWT 注入（`AuthUserIdInjectFilter.java:54` `USER_ROLES_HEADER="X-User-Roles"`，逗号分隔）。本工具手动校验。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.platform.web;

import cn.novelstudio.kernel.exception.BizException;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRoleSupportTest {

    @Test
    void requireAdmin_passes_whenAdminPresent() {
        AuthRoleSupport.requireAdmin("user,admin");
    }

    @Test
    void requireAdmin_throws_whenAbsent() {
        assertThatThrownBy(() -> AuthRoleSupport.requireAdmin("user"))
            .isInstanceOf(BizException.class);
    }

    @Test
    void requireAdmin_throws_whenNull() {
        assertThatThrownBy(() -> AuthRoleSupport.requireAdmin(null))
            .isInstanceOf(BizException.class);
    }

    @Test
    void hasAdmin_true_whenPresent() {
        assertThat(AuthRoleSupport.hasAdmin("vip,admin")).isTrue();
        assertThat(AuthRoleSupport.hasAdmin("user")).isFalse();
    }
}
```
（确认 `BizException` 包：`cn.novelstudio.kernel.exception.BizException`；`ResultCode.FORBIDDEN` 存在。运行前 `grep -n "FORBIDDEN" novel-studio/studio-kernel/src/main/java/cn/novelstudio/kernel/result/ResultCode.java` 核实枚举名。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-platform/studio-platform-web -am test -Dtest=AuthRoleSupportTest
```
Expected: FAIL（类不存在）。

- [ ] **Step 3: 写 AuthRoleSupport**

```java
package cn.novelstudio.platform.web;

import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.result.ResultCode;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public final class AuthRoleSupport {

    private AuthRoleSupport() {}

    public static Set<String> parseRoles(String rolesHeader) {
        if (rolesHeader == null || rolesHeader.isBlank()) return Set.of();
        return Arrays.stream(rolesHeader.split(","))
            .map(String::trim).filter(s -> !s.isEmpty())
            .collect(Collectors.toSet());
    }

    public static boolean hasAdmin(String rolesHeader) {
        return parseRoles(rolesHeader).contains("admin");
    }

    public static void requireAdmin(String rolesHeader) {
        if (!hasAdmin(rolesHeader)) {
            throw BizException.of(ResultCode.FORBIDDEN);
        }
    }
}
```
（`ResultCode.FORBIDDEN` 若实际名为 `FORBIDDEN_ACCESS`/`PERMISSION_DENIED` 按实际改。）

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-platform/studio-platform-web -am test -Dtest=AuthRoleSupportTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-platform/studio-platform-web/src/main/java/cn/novelstudio/platform/web/AuthRoleSupport.java \
        novel-studio/studio-platform/studio-platform-web/src/test/java/cn/novelstudio/platform/web/AuthRoleSupportTest.java
git commit -m "feat(model): AuthRoleSupport admin 角色手动校验"
```

---

## Task 2: V16 迁移

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V16__ai_model.sql`

- [ ] **Step 1: 写迁移 SQL**

```sql
-- ai_model: 全局模型目录
CREATE TABLE IF NOT EXISTS ai_model (
    id              VARCHAR(36) PRIMARY KEY,
    code            VARCHAR(64) NOT NULL UNIQUE,
    display_name    VARCHAR(120) NOT NULL,
    model_type      VARCHAR(16) NOT NULL,
    provider        VARCHAR(32) NOT NULL,
    protocol        VARCHAR(16) NOT NULL,
    model_name      VARCHAR(120) NOT NULL,
    base_url        VARCHAR(512) NOT NULL,
    api_key_enc     TEXT NOT NULL,
    max_tokens      INTEGER,
    temperature     DOUBLE PRECISION,
    input_price_per_1k_micros  BIGINT,
    output_price_per_1k_micros BIGINT,
    price_multiplier DECIMAL(6,3) NOT NULL DEFAULT 1.000,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_model_type_active ON ai_model (model_type, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_model_default_per_type ON ai_model (model_type) WHERE is_default = TRUE;

-- ai_model_plan_access: 模型-套餐多对多
CREATE TABLE IF NOT EXISTS ai_model_plan_access (
    model_id  VARCHAR(36) NOT NULL,
    plan_code VARCHAR(32) NOT NULL,
    PRIMARY KEY (model_id, plan_code)
);

-- user_model: 用户默认模型 + BYOK
CREATE TABLE IF NOT EXISTS user_model (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    model_type      VARCHAR(16) NOT NULL DEFAULT 'llm',
    public_model_id VARCHAR(36),
    label           VARCHAR(120),
    provider        VARCHAR(32),
    protocol        VARCHAR(16),
    model_name      VARCHAR(120),
    base_url        VARCHAR(512),
    api_key_enc     TEXT,
    is_byok         BOOLEAN NOT NULL DEFAULT FALSE,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_model_user ON user_model (user_id, model_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_model_default ON user_model (user_id, model_type) WHERE is_default = TRUE;

-- usage_event 扩展
ALTER TABLE usage_event ADD COLUMN IF NOT EXISTS byok BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usage_event ADD COLUMN IF NOT EXISTS model_code VARCHAR(64);
```
（`usage_event` 表在 billing 模块 V3 迁移建；content 模块的 Flyway history（`flyway_schema_history_content`）能否改 billing 的表？——`usage_event` 由 billing 模块迁移管理，本迁移放 **billing 模块** `V10__usage_byok_model_code.sql` 更合规。**修正**：把 usage_event 的两列 ALTER 拆到 billing 模块新迁移 `V10__usage_byok_model_code.sql`，本文件只建 ai_model/plan_access/user_model。）

- [ ] **Step 2: 拆 usage_event 列到 billing 模块**

Create `novel-studio/studio-modules/studio-module-billing/src/main/resources/db/migration/V10__usage_byok_model_code.sql`:
```sql
ALTER TABLE usage_event ADD COLUMN IF NOT EXISTS byok BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usage_event ADD COLUMN IF NOT EXISTS model_code VARCHAR(64);
```
（billing 最新迁移 V9，下一个 V10。）

- [ ] **Step 3: 启动验证 Flyway 应用迁移**

`_restart-dev-stack.ps1`，查启动日志无 Flyway 报错；连 CN PG 确认表/列：
```bash
PGPASSWORD=<pg-pwd> psql -h 118.89.123.201 -p 15432 -U <user> -d <db> -c "\d ai_model" -c "\d user_model" -c "\d usage_event"
```
（密码见 `scripts/local-cn.env`。）

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V16__ai_model.sql \
        novel-studio/studio-modules/studio-module-billing/src/main/resources/db/migration/V10__usage_byok_model_code.sql
git commit -m "feat(model): V16 ai_model/user_model + V10 usage_event byok/model_code"
```

---

## Task 3: AiModelEntity + Repo

**Files:**
- Create: `.../entity/AiModelEntity.java`
- Create: `.../repository/AiModelRepository.java`
- Test: `.../repository/AiModelRepositoryTest.java`

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.AiModelEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class AiModelRepositoryTest {

    @Autowired AiModelRepository repo;

    private AiModelEntity mk(String code, String type, boolean def) {
        AiModelEntity e = new AiModelEntity();
        e.setCode(code); e.setDisplayName(code); e.setModelType(type);
        e.setProvider("openai"); e.setProtocol("openai"); e.setModelName(code);
        e.setBaseUrl("https://x"); e.setApiKeyEnc("enc");
        e.setPriceMultiplier(1.0); e.setActive(true); e.setDefault(def);
        return e;
    }

    @Test
    void findByModelTypeAndActiveTrue_filters() {
        repo.save(mk("a", "llm", false));
        repo.save(mk("b", "embedding", true));
        List<AiModelEntity> llms = repo.findByModelTypeAndActiveTrue("llm");
        assertThat(llms).hasSize(1).extracting(AiModelEntity::getCode).contains("a");
    }

    @Test
    void findDefaultByType_returnsDefault() {
        repo.save(mk("def", "llm", true));
        repo.save(mk("other", "llm", false));
        AiModelEntity def = repo.findFirstByModelTypeAndIsDefaultTrueAndIsActiveTrue("llm").orElseThrow();
        assertThat(def.getCode()).isEqualTo("def");
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=AiModelRepositoryTest
```

- [ ] **Step 3: 写 AiModelEntity**

```java
package cn.novelstudio.module.content.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ai_model")
@Getter
@Setter
public class AiModelEntity {

    @Id @Column(length = 36, nullable = false)
    private String id;

    @Column(nullable = false, length = 64, unique = true)
    private String code;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "model_type", nullable = false, length = 16)
    private String modelType;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(nullable = false, length = 16)
    private String protocol;

    @Column(name = "model_name", nullable = false, length = 120)
    private String modelName;

    @Column(name = "base_url", nullable = false, length = 512)
    private String baseUrl;

    @Column(name = "api_key_enc", nullable = false, columnDefinition = "TEXT")
    private String apiKeyEnc;

    @Column(name = "max_tokens")
    private Integer maxTokens;

    private Double temperature;

    @Column(name = "input_price_per_1k_micros")
    private Long inputPricePer1kMicros;

    @Column(name = "output_price_per_1k_micros")
    private Long outputPricePer1kMicros;

    @Column(name = "price_multiplier", nullable = false, precision = 6, scale = 3)
    private BigDecimal priceMultiplier = BigDecimal.ONE;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

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

- [ ] **Step 4: 写 AiModelRepository**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.AiModelEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AiModelRepository extends JpaRepository<AiModelEntity, String> {
    List<AiModelEntity> findByModelTypeAndActiveTrue(String modelType);
    Page<AiModelEntity> findByModelType(String modelType, Pageable pageable);
    Optional<AiModelEntity> findByCode(String code);
    Optional<AiModelEntity> findFirstByModelTypeAndIsDefaultTrueAndIsActiveTrue(String modelType);
}
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=AiModelRepositoryTest
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/AiModelEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/AiModelRepository.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/repository/AiModelRepositoryTest.java
git commit -m "feat(model): AiModelEntity + Repository"
```

---
Part 1 续（T4–T8）见 [part1 续](#) — 为控制行数，T4–T8 在本文件下半部。

## Task 4: UserModelEntity + AiModelPlanAccessEntity + Repos

**Files:**
- Create: `.../entity/UserModelEntity.java`、`.../entity/AiModelPlanAccessEntity.java`、`.../entity/AiModelPlanAccessPk.java`
- Create: `.../repository/UserModelRepository.java`、`.../repository/AiModelPlanAccessRepository.java`

- [ ] **Step 1: 写 UserModelEntity**

```java
package cn.novelstudio.module.content.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "user_model")
@Getter @Setter
public class UserModelEntity {

    @Id @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "model_type", nullable = false, length = 16)
    private String modelType = "llm";

    @Column(name = "public_model_id", length = 36)
    private String publicModelId;

    @Column(length = 120)
    private String label;

    @Column(length = 32)
    private String provider;

    @Column(length = 16)
    private String protocol;

    @Column(name = "model_name", length = 120)
    private String modelName;

    @Column(name = "base_url", length = 512)
    private String baseUrl;

    @Column(name = "api_key_enc", columnDefinition = "TEXT")
    private String apiKeyEnc;

    @Column(name = "is_byok", nullable = false)
    private Boolean byok = false;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

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

- [ ] **Step 2: 写 AiModelPlanAccessPk + Entity**

```java
package cn.novelstudio.module.content.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Getter @NoArgsConstructor @AllArgsConstructor @EqualsAndHashCode
public class AiModelPlanAccessPk implements Serializable {
    private String modelId;
    private String planCode;
}
```

```java
package cn.novelstudio.module.content.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "ai_model_plan_access")
@IdClass(AiModelPlanAccessPk.class)
@Getter @Setter
public class AiModelPlanAccessEntity {
    @Id @Column(name = "model_id", length = 36)
    private String modelId;
    @Id @Column(name = "plan_code", length = 32)
    private String planCode;
}
```

- [ ] **Step 3: 写 Repos**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.UserModelEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserModelRepository extends JpaRepository<UserModelEntity, String> {
    List<UserModelEntity> findByUserIdAndModelType(Long userId, String modelType);
    Optional<UserModelEntity> findByUserIdAndModelTypeAndIsDefaultTrue(Long userId, String modelType);
    boolean existsByPublicModelId(String publicModelId);
}
```

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.AiModelPlanAccessEntity;
import cn.novelstudio.module.content.entity.AiModelPlanAccessPk;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AiModelPlanAccessRepository extends JpaRepository<AiModelPlanAccessEntity, AiModelPlanAccessPk> {
    List<AiModelPlanAccessEntity> findByModelId(String modelId);
    void deleteByModelId(String modelId);
    List<AiModelPlanAccessEntity> findByPlanCode(String planCode);
}
```

- [ ] **Step 4: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/UserModelEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/AiModelPlanAccessEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/AiModelPlanAccessPk.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/UserModelRepository.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/AiModelPlanAccessRepository.java
git commit -m "feat(model): UserModelEntity + AiModelPlanAccessEntity + Repos"
```

---

## Task 5: ModelKeyCodec + ModelProperties + Bean

**Files:**
- Create: `.../support/ModelKeyCodec.java`、`.../config/ModelProperties.java`
- Modify: `.../config/ModelProperties.java` 内提供 AesGcmCodec bean
- Test: `.../support/ModelKeyCodecTest.java`

> 复用 `AesGcmCodec.fromBase64Key`（`studio-platform-security`，content 模块需依赖该 platform 模块——确认 pom 已含 studio-platform-security，若无则加）。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.support;

import cn.novelstudio.platform.security.AesGcmCodec;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ModelKeyCodecTest {

    @Test
    void encryptDecrypt_roundtrip() {
        AesGcmCodec codec = AesGcmCodec.fromBase64Key(AesGcmCodec.randomKeyBase64());
        ModelKeyCodec keyCodec = new ModelKeyCodec(codec);
        String enc = keyCodec.encrypt("sk-secret-123");
        assertThat(enc).isNotEqualTo("sk-secret-123");
        assertThat(keyCodec.decrypt(enc)).isEqualTo("sk-secret-123");
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 ModelKeyCodec**

```java
package cn.novelstudio.module.content.support;

import cn.novelstudio.platform.security.AesGcmCodec;
import org.springframework.stereotype.Component;

@Component
public class ModelKeyCodec {

    private final AesGcmCodec codec;

    public ModelKeyCodec(AesGcmCodec modelKeyAesCodec) {
        this.codec = modelKeyAesCodec;
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) return plaintext;
        return codec.encryptToBase64(plaintext);
    }

    public String decrypt(String ciphertextB64) {
        if (ciphertextB64 == null || ciphertextB64.isEmpty()) return ciphertextB64;
        try {
            return codec.decryptFromBase64(ciphertextB64);
        } catch (Exception e) {
            throw new IllegalStateException("API key 解密失败", e);
        }
    }
}
```

- [ ] **Step 4: 写 ModelProperties + AesGcmCodec Bean**

```java
package cn.novelstudio.module.content.config;

import cn.novelstudio.platform.security.AesGcmCodec;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

@Getter @Setter
@Component
@ConfigurationProperties(prefix = "app.model")
public class ModelProperties {

    /** 必填，base64 编码的 32 字节 AES 密钥；空则启动失败。 */
    private String keyEncryptionKey;

    @Bean
    AesGcmCodec modelKeyAesCodec() {
        if (keyEncryptionKey == null || keyEncryptionKey.isBlank()) {
            throw new IllegalStateException("app.model.key-encryption-key 未配置（MODEL_KEY_ENCRYPTION_KEY）");
        }
        return AesGcmCodec.fromBase64Key(keyEncryptionKey);
    }
}
```

- [ ] **Step 5: 写 application.yml 配置**

在 `studio-app/src/main/resources/application.yml` 的 `app:` 块加：
```yaml
  model:
    key-encryption-key: ${MODEL_KEY_ENCRYPTION_KEY:}
```

- [ ] **Step 6: 跑测试验证通过**

测试需构造 `AesGcmCodec`（不依赖 bean），Step 1 测试已直接用 `fromBase64Key`，应 PASS。

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=ModelKeyCodecTest
```

- [ ] **Step 7: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/support/ModelKeyCodec.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/config/ModelProperties.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/support/ModelKeyCodecTest.java \
        novel-studio/studio-app/src/main/resources/application.yml
git commit -m "feat(model): ModelKeyCodec(AesGcmCodec) + ModelProperties + key-encryption-key 配置"
```

---

Part 1 余下 T6（AiModelService）、T7（CrmModelController）、T8（ModelBootstrap）见 [part1b](./2026-06-19-model-config-part1b-java-model.md)（若超出 300 行则拆；否则本文件接续）。本册到此 ~300 行上限，T6–T8 移至下册。

→ 继续 [Part 1b](./2026-06-19-model-config-part1b-java-model.md)
