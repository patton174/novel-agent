# Part 4 — Java 控制器实现计划

> 主索引：[2026-06-19-billing.md](./2026-06-19-billing.md) ｜ [Part 3](./2026-06-19-billing-part3-java-redeem.md)
> 设计：[册1 §3](../specs/2026-06-19-billing-design.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。

---

## Task 14: BillingAuthController 余额/兑换/申请

**Files:**
- Modify: `.../controller/auth/BillingAuthController.java`

> 现有 BillingAuthController（`/api/billing/auth/*`）加余额/兑换/申请端点。

- [ ] **Step 1: 加端点**

注入 `UserBalanceBiz`、`RedemptionBiz`、`UpgradeRequestBiz`。加端点：
```java
    @GetMapping("/balance")
    public Result<Map<String, Object>> balance(@RequestHeader("X-User-Id") String userId) {
        long bal = userBalanceBiz.getBalance(parseUserId(userId));
        return ok(Map.of("balanceMicros", bal));
    }

    @PostMapping("/redeem")
    public Result<Map<String, Object>> redeem(@RequestHeader("X-User-Id") String userId,
                                              @RequestBody Map<String, String> body) {
        String applied = redemptionBiz.redeem(parseUserId(userId), body.get("code"));
        return ok(Map.of("applied", applied));
    }

    @PostMapping("/upgrade-request")
    public Result<Map<String, Object>> createUpgradeRequest(
        @RequestHeader("X-User-Id") String userId, @RequestBody Map<String, String> body) {
        String id = upgradeRequestBiz.create(parseUserId(userId),
            body.get("requestType"), body.get("targetValue"), body.get("reason"));
        return ok(Map.of("id", id));
    }

    @GetMapping("/upgrade-requests")
    public Result<List<UpgradeRequestEntity>> myUpgradeRequests(
        @RequestHeader("X-User-Id") String userId) {
        return ok(upgradeRequestBiz.listMine(parseUserId(userId)));
    }
```
（import `java.util.List`、`java.util.Map`、实体。`parseUserId` 在 BaseController/BaseBiz。返回 entity 直接——或建 DTO 隐藏内部字段，简化先用 entity。）

- [ ] **Step 2: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```

- [ ] **Step 3: 启动验证**

`_restart-dev-stack.ps1`，curl 测（需 JWT cookie）：
```bash
curl -s -H "Cookie: <cookie>" http://127.0.0.1:8080/api/billing/auth/balance
```
Expected: `{"code":0,"data":{"balanceMicros":0}}`。

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/controller/auth/BillingAuthController.java
git commit -m "feat(billing): BillingAuthController 余额/兑换/申请端点"
```

---

## Task 15: BillingCrmController CDK/审批/余额

**Files:**
- Modify: `.../controller/crm/BillingCrmController.java`
- Create: `.../support/RedemptionCodeGenerator.java`（生成码）

> CRM 端点加 admin 门（AuthRoleSupport）+ CDK 生成/列表/作废 + 审批列表/批准/驳回 + 余额查/调整 + 赊账列表。

- [ ] **Step 1: RedemptionCodeGenerator（生成码）**

```java
package cn.novelstudio.module.billing.support;

import org.springframework.stereotype.Component;
import java.security.SecureRandom;

@Component
public class RedemptionCodeGenerator {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去易混字符
    private final SecureRandom rnd = new SecureRandom();

    public String generate(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(ALPHABET.charAt(rnd.nextInt(ALPHABET.length())));
        return sb.toString();
    }
}
```

- [ ] **Step 2: BillingCrmController 加 CDK 端点**

注入 `RedemptionCodeRepository`、`RedemptionRecordRepository`、`RedemptionCodeGenerator`、`UpgradeRequestBiz`、`UserBalanceBiz`、`UsagePeriodSummaryRepository`、`AuthRoleSupport`（静态工具，无需注入）。加：
```java
    @PostMapping("/redemption-code/generate")
    public Result<List<Map<String, Object>>> generateCodes(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestHeader(value = "X-User-Id", required = false) String actor,
        @RequestBody Map<String, Object> body
    ) {
        AuthRoleSupport.requireAdmin(roles);
        String type = (String) body.get("type");
        String value = (String) body.get("value");
        int count = body.get("count") != null ? (int) body.get("count") : 1;
        int maxUses = body.get("maxUses") != null ? (int) body.get("maxUses") : 1;
        Instant expiresAt = body.get("expiresAt") != null
            ? Instant.parse((String) body.get("expiresAt")) : null;
        Long adminId = parseOptionalUserId(actor);
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (int i = 0; i < count; i++) {
            RedemptionCodeEntity c = new RedemptionCodeEntity();
            c.setId(cn.novelstudio.kernel.tools.IdWorker.nextIdStr());
            c.setCode(redemptionCodeGenerator.generate(24));
            c.setType(type); c.setValue(value); c.setMaxUses(maxUses); c.setUsedCount(0);
            c.setExpiresAt(expiresAt); c.setCreatedBy(adminId); c.setCreatedAt(Instant.now());
            redemptionCodeRepository.save(c);
            out.add(Map.of("id", c.getId(), "code", c.getCode()));
        }
        return ok(out);
    }

    @GetMapping("/redemption-code/page")
    public Result<Page<RedemptionCodeEntity>> pageCodes(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(redemptionCodeRepository.findAllByOrderByCreatedAtDesc(
            PageRequest.of(Math.max(0, pageCurrent - 1), pageSize)));
    }

    @DeleteMapping("/redemption-code/{id}")
    public Result<Void> deleteCode(@RequestHeader(value = "X-User-Roles", required = false) String roles,
                                   @PathVariable String id) {
        AuthRoleSupport.requireAdmin(roles);
        redemptionCodeRepository.deleteById(id);
        return ok();
    }
```
（import `cn.novelstudio.platform.web.AuthRoleSupport`、`org.springframework.data.domain.PageRequest`、实体。）

- [ ] **Step 3: BillingCrmController 加审批端点**

```java
    @GetMapping("/upgrade-request/page")
    public Result<Page<UpgradeRequestEntity>> pageUpgradeRequests(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(upgradeRequestBiz.list(status, pageCurrent, pageSize));
    }

    @PostMapping("/upgrade-request/{id}/approve")
    public Result<Void> approveUpgrade(@RequestHeader(value = "X-User-Roles", required = false) String roles,
                                       @RequestHeader(value = "X-User-Id", required = false) String actor,
                                       @PathVariable String id, @RequestBody Map<String, String> body) {
        AuthRoleSupport.requireAdmin(roles);
        upgradeRequestBiz.approve(id, parseOptionalUserId(actor), body.get("reviewNote"));
        return ok();
    }

    @PostMapping("/upgrade-request/{id}/reject")
    public Result<Void> rejectUpgrade(@RequestHeader(value = "X-User-Roles", required = false) String roles,
                                      @RequestHeader(value = "X-User-Id", required = false) String actor,
                                      @PathVariable String id, @RequestBody Map<String, String> body) {
        AuthRoleSupport.requireAdmin(roles);
        upgradeRequestBiz.reject(id, parseOptionalUserId(actor), body.get("reviewNote"));
        return ok();
    }
```

- [ ] **Step 4: BillingCrmController 加余额/赊账端点**

```java
    @GetMapping("/balance/{userId}")
    public Result<Map<String, Object>> getBalance(@RequestHeader(value = "X-User-Roles", required = false) String roles,
                                                  @PathVariable Long userId) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(Map.of("balanceMicros", userBalanceBiz.getBalance(userId)));
    }

    @PostMapping("/balance/{userId}/adjust")
    public Result<Void> adjustBalance(@RequestHeader(value = "X-User-Roles", required = false) String roles,
                                      @RequestHeader(value = "X-User-Id", required = false) String actor,
                                      @PathVariable Long userId, @RequestBody Map<String, Object> body) {
        AuthRoleSupport.requireAdmin(roles);
        long delta = ((Number) body.get("deltaMicros")).longValue();
        userBalanceBiz.adjust(userId, delta);
        return ok();
    }

    @GetMapping("/overage")
    public Result<List<UsagePeriodSummaryEntity>> listOverage(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam String period) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(usagePeriodSummaryRepository.findByPeriodYyyyMmAndOverageMicrosGreaterThan(period, 0L));
    }
```

- [ ] **Step 5: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/controller/crm/BillingCrmController.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/support/RedemptionCodeGenerator.java
git commit -m "feat(billing): BillingCrmController CDK/审批/余额/赊账端点 + admin 门"
```

---

Part 4 完成。→ 继续 [Part 5 — 前端](./2026-06-19-billing-part5-frontend.md)
