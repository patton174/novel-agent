# 后端工程化 + 仪表盘 API 实施计划

> ⚠️ **历史设计记录**。生产已迁移至 **novel-studio 单体**，现状以 `CLAUDE.md` / `.cursor/rules/project-architecture.mdc` 为准。本文保留作历史参考，**勿据以部署**（旧微服务 agent-gateway/auth/pyai/content/consumer 与 `restart-dev.sh` 均已废弃）。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 参考 roncoo-education，将 novel-agent 后端工程化为 `common-core` + API 受众分层 + Biz 层，并交付用户/管理端仪表盘统计 API。

**Architecture:** 新 API 路径 `/api/{service}/{audience}/{resource}`；Gateway 按 audience 段鉴权；新代码走 Controller→Biz→Dao；统一 `Result<T>` 响应。旧 `/api/auth/login` 等路径保留兼容。

**Tech Stack:** Java 17, Spring Boot 3.2.5, Spring Cloud Gateway, JPA, Redis, Nimbus JWT

**Spec:** `docs/superpowers/specs/2026-06-05-dashboard-engineering-design.md`（用户已确认 2026-06-05）

**参考项目:** `D:/Users/JZJ/Desktop/companyproject/education-system/roncoo-education`

---

## Phase B1 — agent-common-core 模块

### Task B1-1: 创建 common-core 子模块

**Files:**
- Create: `legacy/novel-agent/agent-common/agent-common-core/pom.xml`
- Modify: `legacy/novel-agent/agent-common/pom.xml`
- Modify: `legacy/novel-agent/pom.xml`（dependencyManagement）
- Create: `legacy/novel-agent/agent-common/agent-common-core/src/main/java/com/novel/agent/common/core/base/Result.java`
- Create: `legacy/novel-agent/agent-common/agent-common-core/src/main/java/com/novel/agent/common/core/base/Page.java`
- Create: `legacy/novel-agent/agent-common/agent-common-core/src/main/java/com/novel/agent/common/core/enums/StatusIdEnum.java`
- Create: `legacy/novel-agent/agent-common/agent-common-core/src/main/java/com/novel/agent/common/core/biz/BaseBiz.java`

- [ ] **Step 1: 创建 pom.xml**

```xml
<!-- agent-common/agent-common-core/pom.xml -->
<parent>
    <groupId>com.novel.agent</groupId>
    <artifactId>agent-common</artifactId>
    <version>1.0.0-SNAPSHOT</version>
</parent>
<artifactId>agent-common-core</artifactId>
<dependencies>
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-web</artifactId>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

- [ ] **Step 2: Result.java**

```java
package com.novel.agent.common.core.base;

public record Result<T>(int code, String msg, T data) {
    public static final int SUCCESS = 200;

    public static <T> Result<T> ok(T data) {
        return new Result<>(SUCCESS, "success", data);
    }

    public static <T> Result<T> fail(int code, String msg) {
        return new Result<>(code, msg, null);
    }

    public boolean isSuccess() {
        return code == SUCCESS;
    }
}
```

- [ ] **Step 3: Page.java**

```java
package com.novel.agent.common.core.base;

import java.util.List;

public record Page<T>(List<T> list, long totalCount, int pageCurrent, int pageSize) {
    public static <T> Page<T> of(List<T> list, long total, int page, int size) {
        return new Page<>(list, total, page, size);
    }
}
```

- [ ] **Step 4: StatusIdEnum.java**

```java
package com.novel.agent.common.core.enums;

public enum StatusIdEnum {
    YES(1, "正常"),
    NO(0, "禁用");

    private final int code;
    private final String desc;

    StatusIdEnum(int code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public int getCode() { return code; }
    public String getDesc() { return desc; }
}
```

- [ ] **Step 5: 在 agent-auth、agent-content 引入依赖**

```xml
<dependency>
    <groupId>com.novel.agent</groupId>
    <artifactId>agent-common-core</artifactId>
</dependency>
```

- [ ] **Step 6: 编译验证**

```bash
cd novel-agent && mvn compile -pl agent-common/agent-common-core,agent-auth,agent-content -am
```

Expected: BUILD SUCCESS

---

## Phase B2 — Gateway 增强 + dashboard API

### Task B2-1: JWT roles 注入 X-User-Roles

**Files:**
- Modify: `legacy/novel-agent/agent-common/agent-common-security/src/main/java/com/novel/agent/common/security/JwtCodec.java`
- Modify: `legacy/novel-agent/agent-gateway/src/main/java/com/novel/agent/gateway/filter/AuthGatewayFilter.java`
- Modify: `legacy/novel-agent/agent-gateway/src/main/java/com/novel/agent/gateway/support/GatewayAuthSupport.java`

- [ ] **Step 1: 确认 JwtCodec 已写入 roles claim**

检查 `JwtAuthService` 签发时 `roles` 含 `authUser.getRole()`。

- [ ] **Step 2: AuthGatewayFilter 注入 X-User-Roles**

```java
// 解析 JWT 后
String roles = claims.get("roles", String.class); // 或 List 转逗号
if (roles != null) {
    builder.header("X-User-Roles", roles);
}
```

- [ ] **Step 3: 单元验证**

启动 gateway 本地或集成测试：带 admin JWT 请求，下游收到 `X-User-Roles: admin`。

---

### Task B2-2: CrmGatewayFilter + AuthAudienceFilter

**Files:**
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novel/agent/gateway/filter/CrmGatewayFilter.java`
- Create: `legacy/novel-agent/agent-gateway/src/main/java/com/novel/agent/gateway/filter/AuthAudienceFilter.java`
- Modify: `legacy/novel-agent/agent-gateway/src/main/java/com/novel/agent/gateway/config/GatewayFilterConfig.java`（或等效注册处）

- [ ] **Step 1: CrmGatewayFilter**

```java
@Component
@Order(-99)
public class CrmGatewayFilter implements GlobalFilter {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (!path.contains("/crm/")) {
            return chain.filter(exchange);
        }
        String roles = exchange.getRequest().getHeaders().getFirst("X-User-Roles");
        if (roles == null || !roles.contains("admin")) {
            exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
            return exchange.getResponse().setComplete();
        }
        return chain.filter(exchange);
    }
}
```

注意：`X-User-Roles` 由 `AuthGatewayFilter`（order -100）先行注入；若 roles 在 JWT 解析前不可用，改为在 `AuthGatewayFilter` 内联 crm 校验。

- [ ] **Step 2: AuthAudienceFilter**

路径匹配 `/api/auth/auth/` 或 `/api/content/auth/`（排除 `/api/auth/api/`）时，无 `X-User-Id` → 401。

- [ ] **Step 3: 编译 gateway**

```bash
cd novel-agent && mvn compile -pl agent-gateway -am
```

---

### Task B2-3: 扩展 auth/info + 用户 dashboard API

**Files:**
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/auth/AuthUserInfoController.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/auth/biz/AuthUserInfoBiz.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/auth/resp/AuthUserInfoResp.java`
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/auth/AuthDashboardController.java`
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/auth/biz/AuthDashboardBiz.java`
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/auth/resp/AuthDashboardSummaryResp.java`
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/auth/resp/AuthRecentNovelResp.java`

- [ ] **Step 1: AuthUserInfoResp**

```java
public record AuthUserInfoResp(
    Long userId,
    String username,
    String email,
    String role,
    Boolean emailVerified
) {}
```

- [ ] **Step 2: GET /api/auth/auth/info**

```java
@RestController
@RequestMapping("/api/auth/auth")
public class AuthUserInfoController {
    private final AuthUserInfoBiz biz;

    @GetMapping("/info")
    public Result<AuthUserInfoResp> info(@RequestHeader("X-User-Id") Long userId) {
        return Result.ok(biz.getInfo(userId));
    }
}
```

- [ ] **Step 3: AuthDashboardBiz 聚合查询**

```java
// 伪代码
public AuthDashboardSummaryResp summary(Long userId) {
    long novelCount = novelRepository.countByUserId(userId);
    long chapterCount = chapterRepository.countByUserId(userId);
    long weeklyWords = chapterRepository.sumWordCountSince(userId, weekAgo);
    long agentRuns = agentRunRepository.countByUserId(userId);
    return new AuthDashboardSummaryResp(novelCount, chapterCount, weeklyWords, agentRuns);
}
```

需在 `ChapterRepository` / `AgentRunRepository` 添加 count 查询方法。

- [ ] **Step 4: GET /api/content/auth/dashboard/summary**

- [ ] **Step 5: GET /api/content/auth/dashboard/recent-novels**

返回 `List<AuthRecentNovelResp>`：`novelId, title, lastChapterId, updatedAt`。

- [ ] **Step 6: 旧路径兼容（可选本 Phase）**

`AuthController` 保留 `GET /api/auth/info` 返回 `userId` only；新前端走 `/api/auth/auth/info`。

---

### Task B2-4: CRM 统计 API（content 侧）

**Files:**
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/crm/CrmStatsController.java`
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/crm/biz/CrmStatsBiz.java`
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/crm/resp/CrmStatsOverviewResp.java`
- Create: `legacy/novel-agent/agent-content/src/main/java/com/novel/agent/content/service/crm/resp/CrmStatsTrendResp.java`

- [ ] **Step 1: GET /api/content/crm/stats/overview**

全平台：totalNovels, totalChapters, totalAgentRuns

- [ ] **Step 2: GET /api/content/crm/stats/trends?days=30**

按日聚合：registrationTrend（需 Feign 调 auth 或 B4 再聚合）、agentRunTrend

Phase B2 可先只返回 agentRunTrend；registrationTrend 在 B4 Feign 后补齐。

- [ ] **Step 3: 编译**

```bash
cd novel-agent && mvn compile -pl agent-auth,agent-content,agent-gateway -am
```

---

## Phase B3 — CRM 用户管理

### Task B3-1: 用户分页与编辑

**Files:**
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/crm/CrmUserController.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/crm/biz/CrmUserBiz.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/crm/req/CrmUserPageReq.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/crm/req/CrmUserUpdateReq.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/crm/resp/CrmUserPageResp.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/service/crm/resp/CrmUserItemResp.java`
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/dao/UserInfoDao.java`（封装 AuthUserRepository）
- Create: `legacy/novel-agent/agent-auth/src/main/java/com/novel/agent/auth/dao/impl/UserInfoDaoImpl.java`

- [ ] **Step 1: CrmUserPageReq**

```java
public record CrmUserPageReq(
    int pageCurrent,
    int pageSize,
    String usernameKeyword
) {}
```

- [ ] **Step 2: GET /api/auth/crm/user/page**

返回 `Result<Page<CrmUserItemResp>>`

- [ ] **Step 3: GET /api/auth/crm/user/{id}**

- [ ] **Step 4: PUT /api/auth/crm/user/{id}**

Body: `CrmUserUpdateReq(role, isActive)`
禁用用户时：可选吊销 Redis session `auth:device:*`

- [ ] **Step 5: GET /api/auth/crm/stats/overview**

返回：totalUsers, todayRegistrations, activeUsers（7 日内有心跳）

---

### Task B3-2: Dao 层封装

- [ ] **Step 1: UserInfoDao 接口**

```java
public interface UserInfoDao {
    Page<AuthUser> pageByKeyword(String keyword, int page, int size);
    Optional<AuthUser> findById(Long id);
    void updateRoleAndStatus(Long id, String role, Boolean isActive);
    long countAll();
    long countCreatedSince(Instant since);
}
```

- [ ] **Step 2: UserInfoDaoImpl 使用 JPA Specification 或 @Query**

- [ ] **Step 3: CrmUserBiz 编排**

Controller 只调 Biz，Biz 调 Dao。

---

## Phase B4 — Feign 模块 + 跨服务聚合

### Task B4-1: 创建 agent-feign 父模块

**Files:**
- Create: `legacy/novel-agent/agent-feign/pom.xml`
- Create: `legacy/novel-agent/agent-feign/agent-feign-auth/pom.xml`
- Create: `legacy/novel-agent/agent-feign/agent-feign-content/pom.xml`
- Modify: `legacy/novel-agent/pom.xml`

- [ ] **Step 1: agent-feign-auth**

```java
// IFeignUserStats.java
@FeignClient(name = "agent-auth", path = "/internal/auth")
public interface IFeignUserStats {
    @GetMapping("/stats/overview")
    UserStatsDto getOverview();
}
```

- [ ] **Step 2: agent-auth 内部端点**

```java
@RestController
@RequestMapping("/internal/auth")
public class InternalUserStatsController implements IFeignUserStats { ... }
```

- [ ] **Step 3: agent-feign-content**

```java
@FeignClient(name = "agent-content", path = "/internal/content")
public interface IFeignContentStats {
    @GetMapping("/stats/overview")
    ContentStatsDto getOverview();
}
```

- [ ] **Step 4: CrmHomeBiz（agent-auth 或新建 agent-data 轻量模块）**

管理端首页一次请求聚合 user + content 统计（对齐 roncoo `CrmHomeDataBiz`）。

可选：前端继续分两次请求，B4 作为优化项。

---

### Task B4-2: registrationTrend 跨服务

- [ ] **Step 1: IFeignUserStats 增加 trends 端点**

`GET /internal/auth/stats/registrations?days=30`

- [ ] **Step 2: CrmStatsBiz 合并 agentRunTrend + registrationTrend**

`GET /api/content/crm/stats/trends` 返回完整数据。

---

## Phase B5 — 旧 API 迁移与清理

### Task B5-1: 公开 API 路径 alias

**Files:**
- Modify: `legacy/novel-agent/agent-gateway`（可选 RewritePath 过滤器）
- Modify: `legacy/novel-agent/agent-auth/.../AuthController.java`

- [ ] **Step 1: Gateway RewritePath 规则**

```
/api/auth/login      → /api/auth/api/login
/api/auth/register   → /api/auth/api/register
/api/auth/refresh    → /api/auth/api/refresh
/api/auth/logout     → /api/auth/api/logout
```

- [ ] **Step 2: 新建 AuthPublicController @RequestMapping("/api/auth/api")**

将 login/register/refresh/logout 迁入，旧 Controller 方法标记 `@Deprecated`。

- [ ] **Step 3: 更新 crypto-manifest 发布脚本**

新 dashboard/crm 路径加入 manifest。

---

### Task B5-2: Consumer 权限同步

**Files:**
- Modify: `legacy/novel-agent/agent-consumer/.../PermissionListener.java`

- [ ] **Step 1: 登录事件写 Redis**

`SET user:role:{userId} {role}` TTL 7d

- [ ] **Step 2: 用户 role 变更时发 MQ 事件**

`CrmUserBiz.update` 后发 `USER_ROLE_CHANGED`。

---

## Phase B6 — 部署与验收

- [x] `mvn compile` 全模块通过
- [x] `crypto-routes.yaml` 已扩展 dashboard/crm 路由；`generate_crypto_manifest.py` 已生成 52 条
- [x] `agent.internal.service-key` 配置已统一（auth/content Feign）
- [ ] 远程 deploy：`deploy-fast.sh gateway auth content consumer`
- [ ] Postman/curl：`GET /api/auth/auth/info` 带 Cookie → 200 + role
- [ ] admin JWT：`GET /api/auth/crm/user/page` → 200
- [ ] 普通 user JWT：同路径 → 403
- [ ] `GET /api/content/auth/dashboard/summary` → 正确计数
- [ ] 旧路径 `/api/auth/login` 仍可用（Gateway rewrite）
- [ ] 前端 F1/F2 联调通过

---

## 阶段依赖图

```
B1 (common-core)
 └─► B2 (Gateway + dashboard API)
      ├─► B3 (CRM 用户管理)
      │    └─► B4 (Feign 聚合)
      └─► B5 (迁移清理)
           └─► B6 (部署验收)

前端 F1 可在 B2 进行中用 mock；F2 依赖 B3。
```

---

## 风险与决策记录

| 风险 | 缓解 |
|------|------|
| 双路径并存混乱 | Gateway rewrite + 文档标注下线日期 |
| chapter 无 word_count | Phase B2 用 `length(content)` |
| CrmGatewayFilter order 与 Auth 冲突 | roles 校验合并进 AuthGatewayFilter |
| 统计查询慢 | 后续加 Redis 缓存 / 物化视图，Phase 1 直接 SQL count |
