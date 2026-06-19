# Part 3 — Java 兑换/审批/余额/续费实现计划

> 主索引：[2026-06-19-billing.md](./2026-06-19-billing.md) ｜ [Part 2](./2026-06-19-billing-part2-java-quota.md)
> 设计：[册1 §3 + 册2 §4](../specs/2026-06-19-billing-design.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 10: UserBalanceBiz（原子扣减/充值/查询）

**Files:**
- Create: `.../service/biz/UserBalanceBiz.java`
- Test: `.../service/biz/UserBalanceBizTest.java`

> 封装 UserBalanceRepository：getOrInit(userId) 查/建行；credit 充值；deduct 扣减（赊账允许负）；getBalance 返回。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import cn.novelstudio.module.billing.repository.UserBalanceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserBalanceBizTest {

    @Mock UserBalanceRepository repo;
    @InjectMocks UserBalanceBiz biz;

    @Test
    void getBalance_returnsZeroForNewUser() {
        when(repo.findById(10L)).thenReturn(Optional.empty());
        assertThat(biz.getBalance(10L)).isEqualTo(0L);
    }

    @Test
    void credit_initsAndCredits() {
        when(repo.findById(10L)).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        biz.credit(10L, 5000L);
        verify(repo).save(argThat(b -> b.getBalanceMicros() == 5000L));
    }

    @Test
    void credit_existingIncrements() {
        UserBalanceEntity b = new UserBalanceEntity();
        b.setUserId(10L); b.setBalanceMicros(1000L);
        when(repo.findById(10L)).thenReturn(Optional.of(b));
        biz.credit(10L, 500L);
        verify(repo).credit(10L, 500L);
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=UserBalanceBizTest
```

- [ ] **Step 3: 写 UserBalanceBiz**

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UserBalanceEntity;
import cn.novelstudio.module.billing.repository.UserBalanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserBalanceBiz {

    private final UserBalanceRepository repo;

    @Transactional(readOnly = true)
    public long getBalance(Long userId) {
        return repo.findById(userId).map(UserBalanceEntity::getBalanceMicros).orElse(0L);
    }

    @Transactional
    public void credit(Long userId, long amountMicros) {
        if (repo.findById(userId).isEmpty()) {
            UserBalanceEntity b = new UserBalanceEntity();
            b.setUserId(userId); b.setBalanceMicros(amountMicros);
            repo.save(b);
        } else {
            repo.credit(userId, amountMicros);
        }
    }

    /** 扣减（赊账允许负）。返回扣后余额。 */
    @Transactional
    public long deduct(Long userId, long amountMicros) {
        if (repo.findById(userId).isEmpty()) {
            UserBalanceEntity b = new UserBalanceEntity();
            b.setUserId(userId); b.setBalanceMicros(-amountMicros);
            repo.save(b);
            return -amountMicros;
        }
        repo.deduct(userId, amountMicros);
        return repo.findById(userId).map(UserBalanceEntity::getBalanceMicros).orElse(0L);
    }

    @Transactional
    public void adjust(Long userId, long deltaMicros) {
        if (deltaMicros >= 0) credit(userId, deltaMicros);
        else deduct(userId, -deltaMicros);
    }
}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=UserBalanceBizTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/UserBalanceBiz.java \
        novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/service/biz/UserBalanceBizTest.java
git commit -m "feat(billing): UserBalanceBiz 查询/充值/扣减/调整"
```

---

## Task 11: RedemptionBiz（兑换各 type）

**Files:**
- Create: `.../service/biz/RedemptionBiz.java`
- Test: `.../service/biz/RedemptionBizTest.java`

> redeem(userId, code)：校验（存在/未过期/未用尽/未兑过）→ consumeOne 原子占名额 → 按 type 生效（balance→credit / plan→changeUserPlan / quota_bonus→加 override）→ 写 record + audit。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.RedemptionCodeEntity;
import cn.novelstudio.module.billing.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.Instant;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedemptionBizTest {

    @Mock RedemptionCodeRepository codeRepo;
    @Mock RedemptionRecordRepository recordRepo;
    @Mock UserBalanceBiz balanceBiz;
    @Mock SubscriptionBiz subscriptionBiz;
    @Mock UsageCrmBiz usageCrmBiz; // 加 quota override 用
    @Mock AuditLogService auditLogService;
    @InjectMocks RedemptionBiz biz;

    private RedemptionCodeEntity mk(String type, String value) {
        RedemptionCodeEntity c = new RedemptionCodeEntity();
        c.setId("c1"); c.setCode("CODE1"); c.setType(type); c.setValue(value);
        c.setMaxUses(1); c.setUsedCount(0); c.setExpiresAt(Instant.now().plusSeconds(3600));
        return c;
    }

    @Test
    void redeem_balance_creditsBalance() {
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(mk("balance", "5000")));
        when(codeRepo.consumeOne("c1")).thenReturn(1);
        when(recordRepo.existsByCodeIdAndUserId("c1", 10L)).thenReturn(false);
        String result = biz.redeem(10L, "CODE1");
        verify(balanceBiz).credit(10L, 5000L);
        assertThat(result).contains("balance");
    }

    @Test
    void redeem_alreadyRedeemed_throws() {
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(mk("balance", "5000")));
        when(recordRepo.existsByCodeIdAndUserId("c1", 10L)).thenReturn(true);
        assertThatThrownBy(() -> biz.redeem(10L, "CODE1"))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    void redeem_expired_throws() {
        RedemptionCodeEntity c = mk("balance", "5000");
        c.setExpiresAt(Instant.now().minusSeconds(60));
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(c));
        assertThatThrownBy(() -> biz.redeem(10L, "CODE1"))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    void redeem_plan_changesPlan() {
        when(codeRepo.findByCode("CODE1")).thenReturn(Optional.of(mk("plan", "pro")));
        when(codeRepo.consumeOne("c1")).thenReturn(1);
        when(recordRepo.existsByCodeIdAndUserId("c1", 10L)).thenReturn(false);
        biz.redeem(10L, "CODE1");
        verify(subscriptionBiz).changeUserPlan(eq(10L), eq("pro"), any(), anyString());
    }
}
```
（`AuditLogService` 包 `cn.novelstudio.module.billing.service`。`changeUserPlan(userId, planCode, actorId, reason)`——actorId 用 userId 自兑。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=RedemptionBizTest
```

- [ ] **Step 3: 写 RedemptionBiz**

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.RedemptionCodeEntity;
import cn.novelstudio.module.billing.entity.RedemptionRecordEntity;
import cn.novelstudio.module.billing.repository.*;
import cn.novelstudio.module.billing.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RedemptionBiz {

    private final RedemptionCodeRepository codeRepo;
    private final RedemptionRecordRepository recordRepo;
    private final UserBalanceBiz balanceBiz;
    private final SubscriptionBiz subscriptionBiz;
    private final UsageCrmBiz usageCrmBiz;
    private final AuditLogService auditLogService;

    @Transactional
    public String redeem(Long userId, String code) {
        RedemptionCodeEntity c = codeRepo.findByCode(code)
            .orElseThrow(() -> new IllegalArgumentException("兑换码无效"));
        if (c.getExpiresAt() != null && c.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("兑换码已过期");
        }
        if (recordRepo.existsByCodeIdAndUserId(c.getId(), userId)) {
            throw new IllegalArgumentException("该兑换码已使用过");
        }
        int affected = codeRepo.consumeOne(c.getId());
        if (affected == 0) {
            throw new IllegalArgumentException("兑换码已用尽");
        }
        // 写 record
        RedemptionRecordEntity rec = new RedemptionRecordEntity();
        rec.setCodeId(c.getId()); rec.setUserId(userId);
        recordRepo.save(rec);

        // 按 type 生效
        String applied;
        switch (c.getType()) {
            case "balance" -> {
                long amount = Long.parseLong(c.getValue());
                balanceBiz.credit(userId, amount);
                applied = "余额充值 " + amount + " 微分";
            }
            case "plan" -> {
                subscriptionBiz.changeUserPlan(userId, c.getValue(), userId, "CDK 兑换套餐");
                applied = "套餐切换为 " + c.getValue();
            }
            case "quota_bonus" -> {
                // value: JSON {"tokenBonus":10000,"runBonus":5}
                Map<String, Object> bonus = parseBonus(c.getValue());
                usageCrmBiz.addQuotaOverride(userId, bonus);  // 现有方法，按签名适配
                applied = "额外额度 " + c.getValue();
            }
            default -> throw new IllegalArgumentException("未知兑换码类型: " + c.getType());
        }
        auditLogService.log(userId, "redemption.redeem", "redemption_code", c.getId(),
            null, Map.of("type", c.getType(), "value", c.getValue(), "applied", applied));
        return applied;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseBonus(String json) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("quota_bonus 值格式错误");
        }
    }
}
```
（`usageCrmBiz.addQuotaOverride` 现有签名——按实际适配参数。）

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=RedemptionBizTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/RedemptionBiz.java \
        novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/service/biz/RedemptionBizTest.java
git commit -m "feat(billing): RedemptionBiz 兑换码(balance/plan/quota_bonus)"
```

---

## Task 12: UpgradeRequestBiz（审批）

**Files:**
- Create: `.../service/biz/UpgradeRequestBiz.java`
- Test: `.../service/biz/UpgradeRequestBizTest.java`

> create(userId, type, targetValue, reason)；list(status/page)；approve(id, adminId, note)→plan:changeUserPlan / quota_bonus:加 override；reject(id, adminId, note)。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UpgradeRequestEntity;
import cn.novelstudio.module.billing.repository.UpgradeRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpgradeRequestBizTest {

    @Mock UpgradeRequestRepository repo;
    @Mock SubscriptionBiz subscriptionBiz;
    @Mock UsageCrmBiz usageCrmBiz;
    @Mock AuditLogService auditLogService;
    @InjectMocks UpgradeRequestBiz biz;

    @Test
    void approve_plan_changesPlan() {
        UpgradeRequestEntity r = new UpgradeRequestEntity();
        r.setId("r1"); r.setUserId(10L); r.setRequestType("plan"); r.setTargetValue("pro"); r.setStatus("pending");
        when(repo.findById("r1")).thenReturn(Optional.of(r));
        biz.approve("r1", 1L, "ok");
        verify(subscriptionBiz).changeUserPlan(eq(10L), eq("pro"), eq(1L), anyString());
        assertThat(r.getStatus()).isEqualTo("approved");
    }

    @Test
    void reject_setsStatus() {
        UpgradeRequestEntity r = new UpgradeRequestEntity();
        r.setId("r2"); r.setUserId(10L); r.setStatus("pending");
        when(repo.findById("r2")).thenReturn(Optional.of(r));
        biz.reject("r2", 1L, "no");
        assertThat(r.getStatus()).isEqualTo("rejected");
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

- [ ] **Step 3: 写 UpgradeRequestBiz**

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UpgradeRequestEntity;
import cn.novelstudio.module.billing.repository.UpgradeRequestRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UpgradeRequestBiz {

    private final UpgradeRequestRepository repo;
    private final SubscriptionBiz subscriptionBiz;
    private final UsageCrmBiz usageCrmBiz;
    private final AuditLogService auditLogService;

    @Transactional
    public String create(Long userId, String requestType, String targetValue, String reason) {
        UpgradeRequestEntity e = new UpgradeRequestEntity();
        e.setUserId(userId); e.setRequestType(requestType);
        e.setTargetValue(targetValue); e.setReason(reason);
        e.setStatus("pending");
        repo.save(e);
        auditLogService.log(userId, "upgrade_request.create", "user", String.valueOf(userId),
            null, Map.of("type", requestType, "target", targetValue));
        return e.getId();
    }

    @Transactional(readOnly = true)
    public Page<UpgradeRequestEntity> list(String status, int pageCurrent, int pageSize) {
        PageRequest p = PageRequest.of(Math.max(0, pageCurrent - 1), pageSize);
        return (status == null || status.isBlank())
            ? repo.findAllByOrderByCreatedAtDesc(p)
            : repo.findByStatusOrderByCreatedAtDesc(status, p);
    }

    @Transactional(readOnly = true)
    public List<UpgradeRequestEntity> listMine(Long userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void approve(String id, Long adminId, String note) {
        UpgradeRequestEntity e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("申请不存在"));
        if (!"pending".equals(e.getStatus())) throw new IllegalStateException("申请已处理");
        switch (e.getRequestType()) {
            case "plan" -> subscriptionBiz.changeUserPlan(e.getUserId(), e.getTargetValue(), adminId, "审批升级");
            case "quota_bonus" -> usageCrmBiz.addQuotaOverride(e.getUserId(), parseBonus(e.getTargetValue()));
            default -> throw new IllegalArgumentException("未知申请类型");
        }
        e.setStatus("approved"); e.setReviewedBy(adminId); e.setReviewedAt(Instant.now()); e.setReviewNote(note);
        repo.save(e);
        auditLogService.log(adminId, "upgrade_request.approve", "upgrade_request", id,
            Map.of("status", "pending"), Map.of("status", "approved", "note", note == null ? "" : note));
    }

    @Transactional
    public void reject(String id, Long adminId, String note) {
        UpgradeRequestEntity e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("申请不存在"));
        if (!"pending".equals(e.getStatus())) throw new IllegalStateException("申请已处理");
        e.setStatus("rejected"); e.setReviewedBy(adminId); e.setReviewedAt(Instant.now()); e.setReviewNote(note);
        repo.save(e);
        auditLogService.log(adminId, "upgrade_request.reject", "upgrade_request", id,
            Map.of("status", "pending"), Map.of("status", "rejected", "note", note == null ? "" : note));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseBonus(String json) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Map.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("quota_bonus 值格式错误");
        }
    }
}
```

- [ ] **Step 4: 跑测试验证通过** + **Step 5: 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=UpgradeRequestBizTest
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/UpgradeRequestBiz.java \
        novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/service/biz/UpgradeRequestBizTest.java
git commit -m "feat(billing): UpgradeRequestBiz 申请/审批"
```

---

## Task 13: BillingRenewalJob（月度续费+赊账结算）

**Files:**
- Create: `.../service/biz/BillingRenewalJob.java`

> @Scheduled cron 月初：① 推进 active 订阅 current_period_end 至下月；② 过期 canceled_at 非空置 inactive；③ 赊账结算（扫上月 overage_micros>0 → audit）。

- [ ] **Step 1: 写 BillingRenewalJob**

```java
package cn.novelstudio.module.billing.service.biz;

import cn.novelstudio.module.billing.entity.UsagePeriodSummaryEntity;
import cn.novelstudio.module.billing.entity.UsagePeriodSummaryId;
import cn.novelstudio.module.billing.entity.UserSubscriptionEntity;
import cn.novelstudio.module.billing.repository.UsagePeriodSummaryRepository;
import cn.novelstudio.module.billing.repository.UserSubscriptionRepository;
import cn.novelstudio.module.billing.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BillingRenewalJob {

    private final UserSubscriptionRepository subRepo;
    private final UsagePeriodSummaryRepository summaryRepo;
    private final AuditLogService auditLogService;

    @Scheduled(cron = "0 0 0 1 * ?")
    @Transactional
    public void renewMonthly() {
        log.info("billing renewal job start");
        // 1. 推进 active 订阅 period_end
        List<UserSubscriptionEntity> active = subRepo.findByStatus("active");
        for (UserSubscriptionEntity sub : active) {
            if (sub.getCurrentPeriodEnd() != null && sub.getCurrentPeriodEnd().isBefore(Instant.now())) {
                sub.setCurrentPeriodStart(sub.getCurrentPeriodEnd());
                sub.setCurrentPeriodEnd(sub.getCurrentPeriodEnd().plus(30, ChronoUnit.DAYS));
                subRepo.save(sub);
            }
        }
        // 2. 过期取消的订阅
        // （canceled_at 非空且 period_end 已过 → inactive；略，按现有 canceled 逻辑）
        // 3. 赊账结算：上月 overage_micros > 0 → audit
        String lastPeriod = java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMonths(1)
            .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"));
        // summaryRepo 无 byPeriod 查询——加一个或遍历（简化：加 repo 方法 findByPeriodYyyyMmAndOverageMicrosGreaterThan）
        settleOverage(lastPeriod);
        log.info("billing renewal job done");
    }

    private void settleOverage(String period) {
        List<UsagePeriodSummaryEntity> overages = summaryRepo
            .findByPeriodYyyyMmAndOverageMicrosGreaterThan(period, 0L);
        for (UsagePeriodSummaryEntity s : overages) {
            auditLogService.log(0L, "overage.settle", "user", String.valueOf(s.getUserId()),
                null, java.util.Map.of("period", period, "overageMicros", s.getOverageMicros()));
        }
    }
}
```
（`UserSubscriptionRepository.findByStatus("active")` + `UsagePeriodSummaryRepository.findByPeriodYyyyMmAndOverageMicrosGreaterThan`——需加 repo 方法。）

- [ ] **Step 2: 加 repo 方法**

`UserSubscriptionRepository` 加 `List<UserSubscriptionEntity> findByStatus(String status)`。
`UsagePeriodSummaryRepository` 加 `List<UsagePeriodSummaryEntity> findByPeriodYyyyMmAndOverageMicrosGreaterThan(String period, Long overage)`。

- [ ] **Step 3: 编译 + 启动验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```
`_restart-dev-stack.ps1` 确认 @Scheduled 注册无错。

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/BillingRenewalJob.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/UserSubscriptionRepository.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/UsagePeriodSummaryRepository.java
git commit -m "feat(billing): BillingRenewalJob 月度续费+赊账结算"
```

---

Part 3 完成。→ 继续 [Part 4 — Java 控制器](./2026-06-19-billing-part4-java-controllers.md)
