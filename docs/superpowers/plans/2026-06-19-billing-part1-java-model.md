# Part 1 — Java 实体/迁移实现计划

> 主索引：[2026-06-19-billing.md](./2026-06-19-billing.md)
> 设计：[册1 §2](../specs/2026-06-19-billing-design.md)
> 约定：包根 `cn.novelstudio.module.billing`；Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 1: V11 迁移

**Files:**
- Create: `novel-studio/studio-modules/studio-module-billing/src/main/resources/db/migration/V11__billing_upgrade.sql`

- [ ] **Step 1: 写迁移 SQL**

```sql
-- user_balance: 余额（CDK 充值 + overage 赊账欠费）
CREATE TABLE IF NOT EXISTS user_balance (
    user_id         BIGINT PRIMARY KEY,
    balance_micros  BIGINT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL
);

-- redemption_code: CDK 兑换码
CREATE TABLE IF NOT EXISTS redemption_code (
    id              VARCHAR(36) PRIMARY KEY,
    code            VARCHAR(64) NOT NULL UNIQUE,
    type            VARCHAR(16) NOT NULL,
    value           VARCHAR(120) NOT NULL,
    max_uses        INTEGER NOT NULL DEFAULT 1,
    used_count      INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_redemption_code_code ON redemption_code (code);

-- redemption_record: 兑换记录（防重+审计）
CREATE TABLE IF NOT EXISTS redemption_record (
    id              BIGSERIAL PRIMARY KEY,
    code_id         VARCHAR(36) NOT NULL,
    user_id         BIGINT NOT NULL,
    redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code_id, user_id)
);

-- upgrade_request: 审批流
CREATE TABLE IF NOT EXISTS upgrade_request (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    request_type    VARCHAR(16) NOT NULL,
    target_value    VARCHAR(120) NOT NULL,
    reason          TEXT,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    reviewed_by     BIGINT,
    reviewed_at     TIMESTAMPTZ,
    review_note     TEXT,
    created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upgrade_request_status ON upgrade_request (status, created_at);
CREATE INDEX IF NOT EXISTS idx_upgrade_request_user ON upgrade_request (user_id);

-- usage_period_summary: overage 赊账累计
ALTER TABLE usage_period_summary ADD COLUMN IF NOT EXISTS overage_micros BIGINT NOT NULL DEFAULT 0;

-- seed free 计划（修 ensureDefaultSubscription bug）
INSERT INTO product_plan (code, name, description, price_cents, currency, billing_interval,
    monthly_token_quota, monthly_run_quota, rate_limit_rpm, overage_policy, is_active, is_featured, sort_order)
VALUES ('free', '免费', '免费体验套餐', 0, 'CNY', 'month', 1000, 10, 5, 'block', TRUE, FALSE, 0)
ON CONFLICT (code) DO NOTHING;

-- free 计划 feature（基础编辑器）
INSERT INTO plan_feature (plan_id, feature_key, enabled)
SELECT p.id, 'basic_editor', TRUE FROM product_plan p WHERE p.code = 'free'
ON CONFLICT (plan_id, feature_key) DO NOTHING;
```
（列名按 V3 `product_plan` schema 核实：`price_cents/currency/billing_interval/monthly_token_quota/monthly_run_quota/rate_limit_rpm/overage_policy/is_active/is_featured/sort_order`——确认一致。）

- [ ] **Step 2: 启动验证 Flyway**

`_restart-dev-stack.ps1`，查日志无 Flyway 报错；连 CN PG 确认 4 表 + overage_micros 列 + free 计划行（密码见 `scripts/local-cn.env`）：
```bash
PGPASSWORD=<pwd> psql -h 118.89.123.201 -p 15432 -U <u> -d <db> -c "SELECT code FROM product_plan WHERE code='free'"
```

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/resources/db/migration/V11__billing_upgrade.sql
git commit -m "feat(billing): V11 迁移—user_balance/redemption/upgrade_request + overage_micros + free seed"
```

---

## Task 2: UserBalanceEntity + Repo

**Files:**
- Create: `.../entity/UserBalanceEntity.java`
- Create: `.../repository/UserBalanceRepository.java`
- Test: `.../repository/UserBalanceRepositoryTest.java`

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class UserBalanceRepositoryTest {

    @Autowired UserBalanceRepository repo;

    @Test
    void findByUserId_returnsBalance() {
        UserBalanceEntity b = new UserBalanceEntity();
        b.setUserId(10L); b.setBalanceMicros(5000L);
        repo.save(b);
        Optional<UserBalanceEntity> found = repo.findById(10L);
        assertThat(found).isPresent();
        assertThat(found.get().getBalanceMicros()).isEqualTo(5000L);
    }

    @Test
    void atomicDeduct_decrementsBalance() {
        UserBalanceEntity b = new UserBalanceEntity();
        b.setUserId(11L); b.setBalanceMicros(1000L);
        repo.save(b);
        int affected = repo.deduct(11L, 300L);
        assertThat(affected).isEqualTo(1);
        assertThat(repo.findById(11L).get().getBalanceMicros()).isEqualTo(700L);
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=UserBalanceRepositoryTest
```

- [ ] **Step 3: 写 UserBalanceEntity**

```java
package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.Instant;

@Entity
@Table(name = "user_balance")
@Getter @Setter
public class UserBalanceEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "balance_micros", nullable = false)
    private Long balanceMicros = 0L;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
```

- [ ] **Step 4: 写 UserBalanceRepository**

```java
package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserBalanceRepository extends JpaRepository<UserBalanceEntity, Long> {

    /** 原子扣减（允许负值赊账）。返回受影响行数。 */
    @Modifying
    @Query("UPDATE UserBalanceEntity b SET b.balanceMicros = b.balanceMicros - :cost WHERE b.userId = :userId")
    int deduct(Long userId, Long cost);

    /** 原子充值。 */
    @Modifying
    @Query("UPDATE UserBalanceEntity b SET b.balanceMicros = b.balanceMicros + :amount WHERE b.userId = :userId")
    int credit(Long userId, Long amount);
}
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=UserBalanceRepositoryTest
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/UserBalanceEntity.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/UserBalanceRepository.java \
        novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/repository/UserBalanceRepositoryTest.java
git commit -m "feat(billing): UserBalanceEntity + Repository（原子扣减/充值）"
```

---

## Task 3: RedemptionCodeEntity + RedemptionRecordEntity + Repos

**Files:**
- Create: `.../entity/RedemptionCodeEntity.java`、`.../entity/RedemptionRecordEntity.java`
- Create: `.../repository/RedemptionCodeRepository.java`、`.../repository/RedemptionRecordRepository.java`

- [ ] **Step 1: 写 RedemptionCodeEntity**

```java
package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "redemption_code")
@Getter @Setter
public class RedemptionCodeEntity {

    @Id @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 64, unique = true)
    private String code;

    @Column(nullable = false, length = 16)
    private String type;          // balance | plan | quota_bonus

    @Column(nullable = false, length = 120)
    private String value;

    @Column(name = "max_uses", nullable = false)
    private Integer maxUses = 1;

    @Column(name = "used_count", nullable = false)
    private Integer usedCount = 0;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
```

- [ ] **Step 2: 写 RedemptionRecordEntity**

```java
package cn.novelstudio.module.billing.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import java.time.Instant;

@Entity
@Table(name = "redemption_record",
    uniqueConstraints = @UniqueConstraint(columnNames = {"code_id", "user_id"}))
@Getter @Setter
public class RedemptionRecordEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code_id", nullable = false, length = 36)
    private String codeId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(name = "redeemed_at", updatable = false)
    private Instant redeemedAt;
}
```

- [ ] **Step 3: 写 Repos**

```java
package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.RedemptionCodeEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;

public interface RedemptionCodeRepository extends JpaRepository<RedemptionCodeEntity, String> {
    Optional<RedemptionCodeEntity> findByCode(String code);
    Page<RedemptionCodeEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** 原子占用一个使用名额（used_count < max_uses 才 +1）。返回受影响行数。 */
    @Modifying
    @Query("UPDATE RedemptionCodeEntity c SET c.usedCount = c.usedCount + 1 WHERE c.id = :id AND c.usedCount < c.maxUses")
    int consumeOne(String id);
}
```

```java
package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.RedemptionRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RedemptionRecordRepository extends JpaRepository<RedemptionRecordEntity, Long> {
    boolean existsByCodeIdAndUserId(String codeId, Long userId);
}
```

- [ ] **Step 4: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/RedemptionCodeEntity.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/RedemptionRecordEntity.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/RedemptionCodeRepository.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/RedemptionRecordRepository.java
git commit -m "feat(billing): RedemptionCodeEntity + RedemptionRecordEntity + Repos"
```

---

## Task 4: UpgradeRequestEntity + Repo

**Files:**
- Create: `.../entity/UpgradeRequestEntity.java`
- Create: `.../repository/UpgradeRequestRepository.java`

- [ ] **Step 1: 写 entity**

```java
package cn.novelstudio.module.billing.entity;

import cn.novelstudio.kernel.tools.IdWorker;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "upgrade_request")
@Getter @Setter
public class UpgradeRequestEntity {

    @Id @Column(length = 36)
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "request_type", nullable = false, length = 16)
    private String requestType;   // plan | quota_bonus

    @Column(name = "target_value", nullable = false, length = 120)
    private String targetValue;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, length = 16)
    private String status = "pending";   // pending | approved | rejected

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null || id.isBlank()) id = IdWorker.nextIdStr();
        if (createdAt == null) createdAt = Instant.now();
    }
}
```

- [ ] **Step 2: 写 repo**

```java
package cn.novelstudio.module.billing.repository;

import cn.novelstudio.module.billing.entity.UpgradeRequestEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UpgradeRequestRepository extends JpaRepository<UpgradeRequestEntity, String> {
    Page<UpgradeRequestEntity> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<UpgradeRequestEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<UpgradeRequestEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
}
```

- [ ] **Step 3: 编译 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/UpgradeRequestEntity.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/UpgradeRequestRepository.java
git commit -m "feat(billing): UpgradeRequestEntity + Repository"
```

---

## Task 5: UsagePeriodSummaryEntity 加 overageMicros

**Files:**
- Modify: `.../entity/UsagePeriodSummaryEntity.java`

- [ ] **Step 1: 加字段**

在 `UsagePeriodSummaryEntity` 的 `costMicros` 后加：
```java
    @Column(name = "overage_micros", nullable = false)
    private Long overageMicros = 0L;
```
（Lombok `@Getter @Setter` 在类上。）

- [ ] **Step 2: 编译 + validate**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```
`_restart-dev-stack.ps1` 确认 validate 通过（V11 已加列）。

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/UsagePeriodSummaryEntity.java
git commit -m "feat(billing): UsagePeriodSummaryEntity 加 overageMicros"
```

---

## Task 6: PlanCrmUpsertReq + PlanCrmBiz overagePolicy

**Files:**
- Modify: `.../dto/PlanCrmUpsertReq.java`
- Modify: `.../service/biz/PlanCrmBiz.java`

- [ ] **Step 1: PlanCrmUpsertReq 加 overagePolicy**

record 加字段：
```java
    String overagePolicy
```
（放 `rateLimitRpm` 后。默认 null——applyFields 时 null 保持现有值。）

- [ ] **Step 2: PlanCrmBiz.applyFields 设值**

`applyFields`（:79-97）加：
```java
    if (req.overagePolicy() != null && !req.overagePolicy().isBlank()) {
        entity.setOveragePolicy(req.overagePolicy());
    }
```

- [ ] **Step 3: PlanCrmBiz.toCrm 返回 overagePolicy**

`toCrm`（:125-139）构造 `PlanCrmResp` 加 `entity.getOveragePolicy()`。`PlanCrmResp` record 加对应字段。

- [ ] **Step 4: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/dto/PlanCrmUpsertReq.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/PlanCrmBiz.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/dto/PlanCrmResp.java
git commit -m "feat(billing): PlanCrmUpsertReq/PlanCrmBiz 接通 overagePolicy"
```

---

Part 1 完成。→ 继续 [Part 2 — Java 配额](./2026-06-19-billing-part2-java-quota.md)
