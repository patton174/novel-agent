# Part 1 — Java 调度基础实现计划

> 主索引：[2026-06-19-crawler.md](./2026-06-19-crawler.md)
> 设计：[册1 §2](../specs/2026-06-19-crawler-design.md)
> 约定：包根 `cn.novelstudio.module.content`；Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 1: AuthRoleSupport（admin 门，模块3/5 共用）

**Files:**
- Create: `novel-studio/studio-platform/studio-platform-web/src/main/java/cn/novelstudio/platform/web/AuthRoleSupport.java`
- Test: `novel-studio/studio-platform/studio-platform-web/src/test/java/cn/novelstudio/platform/web/AuthRoleSupportTest.java`

> codebase 无 `@PreAuthorize`；`X-User-Roles` 由 `AuthUserIdInjectFilter` 从 JWT 注入（逗号分隔）。若模块3/5 已建则跳过本任务。

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
（`BizException` 包 `cn.novelstudio.kernel.exception.BizException`；`ResultCode.FORBIDDEN` 核实枚举名。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-platform/studio-platform-web -am test -Dtest=AuthRoleSupportTest
```

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

- [ ] **Step 4: 跑测试验证通过** + **Step 5: 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-platform/studio-platform-web -am test -Dtest=AuthRoleSupportTest
git add novel-studio/studio-platform/studio-platform-web/src/main/java/cn/novelstudio/platform/web/AuthRoleSupport.java \
        novel-studio/studio-platform/studio-platform-web/src/test/java/cn/novelstudio/platform/web/AuthRoleSupportTest.java
git commit -m "feat(crawl): AuthRoleSupport admin 角色手动校验"
```

---

## Task 2: V18 迁移

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V18__crawl_orchestrator.sql`

- [ ] **Step 1: 写迁移 SQL**

```sql
-- crawl_orchestrator_state: 编排器状态（单行，DB 持久化）
CREATE TABLE IF NOT EXISTS crawl_orchestrator_state (
    id          SMALLINT PRIMARY KEY DEFAULT 1,
    goal        TEXT,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    poll_sec    INTEGER NOT NULL DEFAULT 30,
    updated_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT singleton CHECK (id = 1)
);
INSERT INTO crawl_orchestrator_state (id, goal, enabled, poll_sec, updated_at)
VALUES (1, NULL, FALSE, 30, NOW()) ON CONFLICT (id) DO NOTHING;

-- crawl_job: 调度字段
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS priority        SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS max_retries     SMALLINT NOT NULL DEFAULT 3;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS retry_count     SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS schedule_cron   VARCHAR(64);
ALTER TABLE crawl_job ADD COLUMN IF NOT EXISTS next_run_at     TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_crawl_job_dispatch ON crawl_job (status, priority, created_at)
    WHERE status IN ('PENDING','QUEUED');
CREATE INDEX IF NOT EXISTS idx_crawl_job_schedule ON crawl_job (next_run_at)
    WHERE schedule_cron IS NOT NULL AND status = 'PENDING';

-- site_setting seed
INSERT INTO site_setting (setting_key, setting_value) VALUES
    ('crawl.default_max_retries', '3')
ON CONFLICT (setting_key) DO NOTHING;
```
（`site_setting` 表结构按 V6 迁移核实列名 `setting_key/setting_value`。）

- [ ] **Step 2: 启动验证 Flyway 应用迁移**

`_restart-dev-stack.ps1`，查日志无 Flyway 报错；连 CN PG 确认表/列（密码见 `scripts/local-cn.env`）。

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/resources/db/migration/V18__crawl_orchestrator.sql
git commit -m "feat(crawl): V18 迁移—crawl_orchestrator_state + crawl_job 调度字段"
```

---

## Task 3: CrawlJobEntity 加 5 字段

**Files:**
- Modify: `.../entity/CrawlJobEntity.java`

- [ ] **Step 1: 加字段**

在 `CrawlJobEntity` 的 `updatedAt` 字段后、`@PrePersist` 前加：
```java
    @Column(nullable = false)
    private Short priority = 1;   // 0=high 1=normal 2=low

    @Column(name = "max_retries", nullable = false)
    private Short maxRetries = 3;

    @Column(name = "retry_count", nullable = false)
    private Short retryCount = 0;

    @Column(name = "schedule_cron", length = 64)
    private String scheduleCron;

    @Column(name = "next_run_at")
    private java.time.Instant nextRunAt;
```
（Lombok `@Getter @Setter` 在类上，自动生成。`CrawlJobStatus` 枚举需加 `QUEUED` 值——见下。）

- [ ] **Step 2: CrawlJobStatus 加 QUEUED**

在 `CrawlJobStatus` 枚举加 `QUEUED`（等待令牌/限速重试 dispatch 的中间态）。并在 `CrawlJobService.STARTABLE` 集合确认是否含 QUEUED——QUEUED 不应进 STARTABLE（由 Scheduler 自动 dispatch，非手动 start）。`STARTABLE = {PENDING, PAUSED, FAILED}` 不变。

- [ ] **Step 3: 编译 + validate 验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```
`_restart-dev-stack.ps1` 确认 validate 通过。

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/CrawlJobEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/CrawlJobStatus.java
git commit -m "feat(crawl): CrawlJobEntity 加 priority/max_retries/retry_count/schedule_cron/next_run_at + QUEUED"
```

---

## Task 4: CrawlOrchestratorStateEntity + Repo

**Files:**
- Create: `.../entity/CrawlOrchestratorStateEntity.java`
- Create: `.../repository/CrawlOrchestratorStateRepository.java`

- [ ] **Step 1: 写 entity**

```java
package cn.novelstudio.module.content.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "crawl_orchestrator_state")
@Getter @Setter
public class CrawlOrchestratorStateEntity {

    @Id
    private Short id = 1;

    @Column(columnDefinition = "TEXT")
    private String goal;

    @Column(nullable = false)
    private Boolean enabled = false;

    @Column(name = "poll_sec", nullable = false)
    private Integer pollSec = 30;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() { if (updatedAt == null) updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
```

- [ ] **Step 2: 写 repo**

```java
package cn.novelstudio.module.content.repository;

import cn.novelstudio.module.content.entity.CrawlOrchestratorStateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrawlOrchestratorStateRepository extends JpaRepository<CrawlOrchestratorStateEntity, Short> {
    default CrawlOrchestratorStateEntity singleton() {
        return findById((short) 1).orElseThrow();
    }
}
```

- [ ] **Step 3: 编译验证 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/entity/CrawlOrchestratorStateEntity.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/CrawlOrchestratorStateRepository.java
git commit -m "feat(crawl): CrawlOrchestratorStateEntity + Repository（单行）"
```

---

## Task 5: SiteSettingsBiz.getInt

**Files:**
- Modify: `studio-module-billing/.../service/biz/SiteSettingsBiz.java`

> 现无 typed int 访问器；`effectiveSettings()` 私有。加 `getInt(key, default)` 供 CrawlTokenBucket 读 `crawl.max_concurrent_jobs`。

- [ ] **Step 1: 加 getInt**

在 `SiteSettingsBiz` 加：
```java
    public int getInt(String key, int defaultValue) {
        Object v = effectiveSettings().get(key);
        if (v == null) return defaultValue;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); } catch (NumberFormatException e) { return defaultValue; }
    }
```
（`effectiveSettings()` 现私有——改为 package-private 或保留私有由本类 getInt 调用即可。）

- [ ] **Step 2: ALLOWED_KEYS 加 crawl.default_max_retries**

`ALLOWED_KEYS` Set 加 `"crawl.default_max_retries"`；DEFAULTS 加 `"crawl.default_max_retries", 3`。

- [ ] **Step 3: 编译 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/SiteSettingsBiz.java
git commit -m "feat(crawl): SiteSettingsBiz.getInt + crawl.default_max_retries"
```

---

## Task 6: CrawlTokenBucket（Redis Lua）

**Files:**
- Create: `.../service/crawl/CrawlTokenBucket.java`
- Test: `.../service/crawl/CrawlTokenBucketTest.java`

> Redis Lua 原子 acquire/release。容量从 `SiteSettingsBiz.getInt("crawl.max_concurrent_jobs", 4)`。无 Lua 先例，首例 `DefaultRedisScript`。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.content.service.crawl;

import cn.novelstudio.module.billing.service.biz.SiteSettingsBiz;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CrawlTokenBucketTest {

    @Mock StringRedisTemplate redis;
    @Mock SiteSettingsBiz siteSettings;
    @InjectMocks CrawlTokenBucket bucket;

    @Test
    void capacity_readsSiteSetting() {
        when(siteSettings.getInt("crawl.max_concurrent_jobs", 4)).thenReturn(6);
        assertThat(bucket.capacity()).isEqualTo(6);
    }

    @Test
    void acquire_returnsTrue_whenLuaReturns1() {
        when(siteSettings.getInt(anyString(), anyInt())).thenReturn(4);
        when(redis.execute(any(RedisScript.class), anyList(), any())).thenReturn(1L);
        assertThat(bucket.tryAcquire("job1")).isTrue();
    }

    @Test
    void acquire_returnsFalse_whenLuaReturns0() {
        when(siteSettings.getInt(anyString(), anyInt())).thenReturn(4);
        when(redis.execute(any(RedisScript.class), anyList(), any())).thenReturn(0L);
        assertThat(bucket.tryAcquire("job1")).isFalse();
    }

    @Test
    void release_invokesLua() {
        when(redis.execute(any(RedisScript.class), anyList(), any())).thenReturn(1L);
        bucket.release("job1");
        verify(redis).execute(any(RedisScript.class), anyList(), eq("job1"));
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=CrawlTokenBucketTest
```

- [ ] **Step 3: 写 CrawlTokenBucket**

```java
package cn.novelstudio.module.content.service.crawl;

import cn.novelstudio.module.billing.service.biz.SiteSettingsBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
@RequiredArgsConstructor
public class CrawlTokenBucket {

    private final StringRedisTemplate redis;
    private final SiteSettingsBiz siteSettings;

    private static final String KEY = "crawl:dispatch:token";

    // Lua: 维护一个 SET（持有令牌的 jobId）+ 计数。acquire: 若 SET size < capacity 则 SADD 返回1 else 0
    private static final DefaultRedisScript<Long> ACQUIRE = new DefaultRedisScript<>(
        "if redis.call('scard', KEYS[1]) < tonumber(ARGV[1]) then redis.call('sadd', KEYS[1], ARGV[2]) return 1 else return 0 end",
        Long.class);
    private static final DefaultRedisScript<Long> RELEASE = new DefaultRedisScript<>(
        "redis.call('srem', KEYS[1], ARGV[1]) return 1", Long.class);

    public int capacity() {
        return siteSettings.getInt("crawl.max_concurrent_jobs", 4);
    }

    public boolean tryAcquire(String jobId) {
        Long r = redis.execute(ACQUIRE, List.of(KEY), String.valueOf(capacity()), jobId);
        return r != null && r == 1L;
    }

    public void release(String jobId) {
        redis.execute(RELEASE, List.of(KEY), jobId);
    }
}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=CrawlTokenBucketTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlTokenBucket.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/service/crawl/CrawlTokenBucketTest.java
git commit -m "feat(crawl): CrawlTokenBucket Redis Lua 令牌桶"
```

---

## Task 7: CrawlJobService 改（startJob 令牌/failJob 重试/createJob 字段）

**Files:**
- Modify: `.../service/crawl/CrawlJobService.java`
- Modify: `.../service/crawl/dto/CreateCrawlJobRequest.java`

- [ ] **Step 1: CreateCrawlJobRequest 加字段**

```java
public record CreateCrawlJobRequest(
    @NotBlank String sourceUrl,
    String siteId,
    String configJson,
    Short priority,          // null=默认 1
    Short maxRetries,        // null=默认 3
    String scheduleCron      // null=一次性
) {}
```

- [ ] **Step 2: createJob 接收新字段**

`CrawlJobService.createJob` 签名扩展（或重载）。改 createJob 写入 priority/maxRetries/scheduleCron + nextRunAt（若有 scheduleCron 则算下次）：
```java
    public CrawlJobEntity createJob(String sourceUrl, Long createdByAdminId, String siteId, String configJson,
                                    Short priority, Short maxRetries, String scheduleCron) {
        // ...原逻辑...
        entity.setPriority(priority == null ? 1 : priority);
        entity.setMaxRetries(maxRetries == null ? 3 : maxRetries);
        entity.setScheduleCron(scheduleCron);
        if (scheduleCron != null && !scheduleCron.isBlank()) {
            entity.setNextRunAt(computeNextRun(scheduleCron));  // 用 CronExpression
        }
        return crawlJobRepository.save(entity);
    }
```
（`computeNextRun` 用 `org.springframework.scheduling.support.CronExpression` 解析 + 算下次；校验非法 cron 抛 ValidationException。）

- [ ] **Step 3: startJob 加令牌桶**

`startJob`（:88）改：在 set RUNNING 后、发 MQ 前：
```java
        if (!tokenBucket.tryAcquire(saved.getId())) {
            // 令牌满：置 QUEUED，等 Scheduler 重试
            entity.setStatus(CrawlJobStatus.QUEUED);
            entity.setNextRunAt(Instant.now().plusSeconds(30));
            crawlJobRepository.save(entity);
            crawlJobLogService.append(saved.getId(), CrawlLogLevel.INFO, "爬虫并发已满，已排队等待…");
            return crawlJobRepository.save(entity);
        }
        // 发 MQ ... 原 messageProducer.send(...)
```
（注入 `CrawlTokenBucket tokenBucket`。注意：原 startJob 末尾发 MQ 后返回 saved——现 QUEUED 分支提前返回。成功 dispatch 分支保留发 MQ。）

- [ ] **Step 4: failJob 加重试**

`failJob`（:257）改：
```java
    public CrawlJobEntity failJob(String jobId, String errorMessage) {
        CrawlJobEntity entity = getJob(jobId);
        tokenBucket.release(jobId);  // 释放令牌
        short rc = (short) (entity.getRetryCount() + 1);
        entity.setRetryCount(rc);
        if (rc < entity.getMaxRetries()) {
            entity.setStatus(CrawlJobStatus.QUEUED);
            entity.setErrorMessage(errorMessage);
            entity.setNextRunAt(Instant.now().plusSeconds((long) Math.pow(2, rc) * 30));  // 退避
            crawlJobLogService.append(jobId, CrawlLogLevel.WARN, "失败，将重试(" + rc + "/" + entity.getMaxRetries() + ")：" + errorMessage);
        } else {
            entity.setStatus(CrawlJobStatus.FAILED);
            entity.setErrorMessage(errorMessage);
        }
        return crawlJobRepository.save(entity);
    }
```
（`completeJob`/`cancelJob` 也需 `tokenBucket.release(jobId)`——补。）

- [ ] **Step 5: 编译 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlJobService.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/dto/CreateCrawlJobRequest.java
git commit -m "feat(crawl): CrawlJobService 令牌桶 dispatch + 失败重试 + createJob 调度字段"
```

---

## Task 8: CrawlScheduler（@Scheduled 定时+重试）

**Files:**
- Create: `.../service/crawl/CrawlScheduler.java`

> @Scheduled(fixedDelay=60s) 扫描：① `next_run_at <= now AND schedule_cron IS NOT NULL AND status=PENDING` → startJob；② `status=QUEUED AND next_run_at <= now` → startJob（重试/排队重 dispatch）。

- [ ] **Step 1: CrawlJobRepository 加查询**

在 `CrawlJobRepository` 加：
```java
    @Query("SELECT j FROM CrawlJobEntity j WHERE j.status = :status AND j.nextRunAt <= :now ORDER BY j.priority ASC, j.createdAt ASC")
    List<CrawlJobEntity> findDueForDispatch(@Param("status") CrawlJobStatus status, @Param("now") Instant now);
```
（import `java.time.Instant`、`CrawlJobStatus`、`@Param`。）

- [ ] **Step 2: 写 CrawlScheduler**

```java
package cn.novelstudio.module.content.service.crawl;

import cn.novelstudio.module.content.entity.CrawlJobEntity;
import cn.novelstudio.module.content.entity.CrawlJobStatus;
import cn.novelstudio.module.content.repository.CrawlJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlScheduler {

    private final CrawlJobRepository crawlJobRepository;
    private final CrawlJobService crawlJobService;

    @Scheduled(fixedDelay = 60_000)
    public void dispatchDue() {
        Instant now = Instant.now();
        List<CrawlJobEntity> due = crawlJobRepository.findDueForDispatch(CrawlJobStatus.QUEUED, now);
        due.addAll(crawlJobRepository.findDueForDispatch(CrawlJobStatus.PENDING, now).stream()
            .filter(j -> j.getScheduleCron() != null).toList());
        for (CrawlJobEntity j : due) {
            try {
                crawlJobService.startJob(j.getId());
            } catch (Exception e) {
                log.warn("scheduler dispatch failed job={}: {}", j.getId(), e.getMessage());
            }
        }
    }
}
```
（PENDING 仅 schedule_cron 非空的才定时 dispatch；手动 PENDING 由用户 startJob。QUEUED 全部到点重 dispatch。`startJob` 内令牌满会再 QUEUED+延后。）

- [ ] **Step 3: 编译 + 启动验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```
`_restart-dev-stack.ps1` 确认 scheduler 启动（@Scheduled 注册）。

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlScheduler.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/repository/CrawlJobRepository.java
git commit -m "feat(crawl): CrawlScheduler @Scheduled 定时+QUEUED 重试 dispatch"
```

---

Part 1 完成。→ 继续 [Part 2 — Java 编排器 DB+SSE](./2026-06-19-crawler-part2-java-orchestrator.md)
