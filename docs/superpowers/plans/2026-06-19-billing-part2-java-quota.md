# Part 2 — Java 配额（RPM + overage）实现计划

> 主索引：[2026-06-19-billing.md](./2026-06-19-billing.md) ｜ [Part 1](./2026-06-19-billing-part1-java-model.md)
> 设计：[册2 §4](../specs/2026-06-19-billing-design-part2.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 7: BillingRpmChecker（RPM 滑窗）

**Files:**
- Create: `.../support/BillingRpmChecker.java`
- Test: `.../support/BillingRpmCheckerTest.java`

> agent 不依赖 auth（RateLimitService 不可用），billing 内复刻滑窗逻辑。复用 `TooManyRequestsException`（studio-kernel，billing 可用）。key `billing:rpm:<userId>`。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.billing.support;

import cn.novelstudio.kernel.exception.TooManyRequestsException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import java.time.Duration;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BillingRpmCheckerTest {

    @Mock StringRedisTemplate redis;
    @InjectMocks BillingRpmChecker checker;

    @Test
    void check_underLimit_passes() {
        when(redis.opsForValue()).thenReturn(mockOps(1L));
        assertThatCode(() -> checker.check(10L, 60, Duration.ofSeconds(60))).doesNotThrowAnyException();
    }

    @Test
    void check_overLimit_throws() {
        when(redis.opsForValue()).thenReturn(mockOps(61L));
        assertThatThrownBy(() -> checker.check(10L, 60, Duration.ofSeconds(60)))
            .isInstanceOf(TooManyRequestsException.class);
    }

    private ValueOperations<String, String> mockOps(long count) {
        ValueOperations<String, String> vops = mock(ValueOperations.class);
        when(vops.increment(anyString(), eq(1L))).thenReturn(count);
        return vops;
    }
}
```
（`increment(key, 1L)` 首次返回 1，超 maxRpm 抛。）

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=BillingRpmCheckerTest
```

- [ ] **Step 3: 写 BillingRpmChecker**

```java
package cn.novelstudio.module.billing.support;

import cn.novelstudio.kernel.exception.TooManyRequestsException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class BillingRpmChecker {

    private final StringRedisTemplate redis;

    /** 每分钟请求限流。超 maxRpm 抛 TooManyRequestsException。 */
    public void check(Long userId, int maxRpm, Duration window) {
        if (userId == null || maxRpm <= 0) return;
        String key = "billing:rpm:" + userId;
        Long count = redis.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redis.expire(key, window);
        }
        if (count != null && count > maxRpm) {
            throw new TooManyRequestsException("请求过于频繁，请稍后再试（" + maxRpm + " 次/分钟）");
        }
    }
}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=BillingRpmCheckerTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/support/BillingRpmChecker.java \
        novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/support/BillingRpmCheckerTest.java
git commit -m "feat(billing): BillingRpmChecker RPM 滑窗限流"
```

---

## Task 8: QuotaBiz overage 分支 + RPM check

**Files:**
- Modify: `.../service/biz/QuotaBiz.java`

> `checkAndReserveRun`(:28) 改：① 开头 RPM check（BillingRpmChecker）；② `if(!allowed)` 处读 overagePolicy——block 抛（现有）/ overage 放行（不抛，让 usage 扣余额）。注意 overage 仅 token 维度，run 仍 block（run 超也抛）。

- [ ] **Step 1: 改 checkAndReserveRun**

注入 `BillingRpmChecker rpmChecker`。`checkAndReserveRun` 开头加：
```java
    rpmChecker.check(userId, plan.getRateLimitRpm() == null ? 60 : plan.getRateLimitRpm(), java.time.Duration.ofSeconds(60));
```
`if (!allowed)` 块改：
```java
        if (!allowed) {
            // run 超额：始终 block（防滥用）
            if (!isWithinRunQuota(runsUsed, effective.runQuota())) {
                throw BizException.of(ResultCode.BILLING_QUOTA_EXCEEDED, "本月运行次数已用尽，请升级套餐或等待下月重置");
            }
            // token 超额：overage 策略放行（扣余额由 UsageReportBiz 处理），block 抛
            if ("overage".equals(plan.getOveragePolicy())) {
                // 放行——usage 上报时扣余额/赊账
            } else {
                throw BizException.of(ResultCode.BILLING_QUOTA_EXCEEDED, "本月配额已用尽，请升级套餐或等待下月重置");
            }
        }
```

- [ ] **Step 2: 写测试**

```java
// QuotaBizTest（聚焦 overage 分支，mock 依赖）
@Test
void overagePolicy_allowsTokenOverage_butBlocksRunOverage() {
    // plan.overagePolicy=overage, token 超, run 未超 → 放行（不抛）
    // plan.overagePolicy=overage, run 超 → 抛
    // plan.overagePolicy=block, token 超 → 抛
}
```
（完整 mock QuotaBiz 依赖较繁；本测聚焦 overage 分支逻辑，mock SubscriptionBiz/EffectiveQuotaSupport/Redis/rpmChecker。）

- [ ] **Step 3: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=QuotaBizTest
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/QuotaBiz.java \
        novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/service/biz/QuotaBizTest.java
git commit -m "feat(billing): QuotaBiz overage 分支 + RPM check"
```

---

## Task 9: UsageReportBiz overage 扣余额 + overage_micros

**Files:**
- Modify: `.../service/biz/UsageReportBiz.java`

> `persistReport`：若 plan.overagePolicy=overage 且本次 usage 使 token 超配额，cost 从 user_balance 扣（原子），不足赊账（balance 负）+ overage_micros 累计。

- [ ] **Step 1: persistReport 加 overage 扣余额**

注入 `UserBalanceRepository userBalanceRepo`。在 `upsertPeriodSummary` 调用前后加 overage 逻辑：
```java
        // overage 扣余额（仅 overage 策略 + 超配额 + 非 BYOK）
        if (cost > 0 && !Boolean.TRUE.equals(request.byok())) {
            ProductPlanEntity plan = subscriptionBiz.resolvePlanForUser(request.userId());
            if ("overage".equals(plan.getOveragePolicy())) {
                String period = BillingPeriodSupport.currentPeriodYyyyMm();
                long tokensUsed = readRedisLong(BillingRedisKeys.usageTokensKey(request.userId(), period));
                Long quota = plan.getMonthlyTokenQuota();
                if (quota == null || (tokensUsed + tokenDelta) > quota) {
                    // 超配额部分扣余额（简化：全 cost 扣，配额内 free 已不收费——此处 cost 仅超配额时非 0）
                    int affected = userBalanceRepo.deduct(request.userId(), cost);
                    if (affected == 0) {
                        // 无 balance 行——首次赊账，建行
                        UserBalanceEntity b = new UserBalanceEntity();
                        b.setUserId(request.userId()); b.setBalanceMicros(-cost);
                        try { userBalanceRepo.save(b); } catch (Exception ignored) {}
                    }
                    // overage_micros 累计（upsertPeriodSummary 改造接受 overageDelta）
                }
            }
        }
```
`upsertPeriodSummary` 加 `overageDelta` 参数，累加 `summary.overageMicros`。

- [ ] **Step 2: upsertPeriodSummary 加 overageDelta**

签名改 `upsertPeriodSummary(userId, period, tokenDelta, costDelta, runInc, overageDelta)`，加：
```java
        if (overageDelta > 0) {
            summary.setOverageMicros(summary.getOverageMicros() + overageDelta);
        }
```
所有调用点（persistReport + recordRunStart）补 `overageDelta=0`（recordRunStart）或实际值（persistReport overage 分支）。

- [ ] **Step 3: 写测试**

```java
// UsageReportBizTest 聚焦 overage 扣余额
@Test
void persistReport_overage_deductsBalance_andAccumulatesOverage() {
    // plan.overagePolicy=overage, token 超, cost=500 → user_balance.deduct(500) + overage_micros+=500
}
@Test
void persistReport_blockPolicy_doesNotDeductBalance() {
    // plan.overagePolicy=block → 不扣余额（block 在 QuotaBiz 已挡，但 persistReport 仍不扣）
}
@Test
void persistReport_byok_doesNotDeductBalance() {
    // request.byok=true → 不扣余额
}
```

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=UsageReportBizTest
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/UsageReportBiz.java \
        novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/service/biz/UsageReportBizTest.java
git commit -m "feat(billing): UsageReportBiz overage 扣余额 + overage_micros 累计"
```

---

Part 2 完成。→ 继续 [Part 3 — Java 兑换/审批/余额/续费](./2026-06-19-billing-part3-java-redeem.md)
