# Part 2 — Java 编排器 DB 持久化 + SSE 实现计划

> 主索引：[2026-06-19-crawler.md](./2026-06-19-crawler.md) ｜ [Part 1](./2026-06-19-crawler-part1-java-scheduling.md)
> 设计：[册1 §3 + 册2 §4](../specs/2026-06-19-crawler-design.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 9: CrawlOrchestratorStateService 改 DB 持久化

**Files:**
- Modify: `.../service/crawl/CrawlOrchestratorStateService.java`

> 现状：state 存 Redis `crawl:orchestrator:state`（goal/enabled/pollSec）。改：goal/enabled/pollSec 持久化 DB `crawl_orchestrator_state`，Redis 仅留 decisions 日志（`crawl:orchestrator:decisions` list + seq）。python `get_state` 读 DB（经 Java `/internal/crawl/orchestrator`）。

- [ ] **Step 1: 改 state 读写 DB**

`CrawlOrchestratorStateService` 注入 `CrawlOrchestratorStateRepository`。state 读写方法改 DB：
```java
    private final CrawlOrchestratorStateRepository stateRepo;

    public CrawlOrchestratorStateDTO getState() {
        CrawlOrchestratorStateEntity e = stateRepo.singleton();
        return toDto(e);  // { goal, enabled, pollSec, updatedAt, status, runningJobCount, maxConcurrentJobs... }
    }

    public CrawlOrchestratorStateDTO setGoal(String goal) {
        CrawlOrchestratorStateEntity e = stateRepo.singleton();
        e.setGoal(goal);
        stateRepo.save(e);
        return toDto(e);
    }

    public CrawlOrchestratorStateDTO setEnabled(boolean enabled) {
        CrawlOrchestratorStateEntity e = stateRepo.singleton();
        e.setEnabled(enabled);
        stateRepo.save(e);
        return toDto(e);
    }
```
（`wake`/`sleep`/`complete` 复用 setEnabled + triggerOrchestratorCycle。`toDto` 合并 DB 字段 + 运行状态（runningJobCount from repo count + maxConcurrentJobs from siteSettings）。`mark_sleeping`/`complete_goal` 现走 Redis 的改走 DB。）

- [ ] **Step 2: decisions 保留 Redis**

`record_decision`/`listDecisions` 保留 Redis list（高频日志，不入库）。不变。

- [ ] **Step 3: 编译 + 启动验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```
`_restart-dev-stack.ps1`，curl 测 `GET /api/content/crm/crawl/orchestrator` 返回 DB 内容。

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlOrchestratorStateService.java
git commit -m "feat(crawl): CrawlOrchestratorStateService state 持久化 DB"
```

---

## Task 10: CrawlSseBroadcaster

**Files:**
- Create: `.../service/crawl/CrawlSseBroadcaster.java`

> 管理 SSE emitter 集合，广播 decision/job_status/job_log 事件。仿 `AgentStreamController` StreamingResponseBody 手写帧。

- [ ] **Step 1: 写 CrawlSseBroadcaster**

```java
package cn.novelstudio.module.content.service.crawl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
public class CrawlSseBroadcaster {

    private final List<ResponseBodyEmitter> emitters = new CopyOnWriteArrayList<>();

    public ResponseBodyEmitter register() {
        ResponseBodyEmitter emitter = new ResponseBodyEmitter(0L);  // 无超时
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        return emitter;
    }

    public void broadcast(String event, String data) {
        String frame = "event: " + event + "\ndata: " + data + "\n\n";
        for (ResponseBodyEmitter e : emitters) {
            try {
                e.write(frame.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            } catch (IOException ex) {
                emitters.remove(e);
            }
        }
    }

    public void broadcastDecision(String decision) {
        broadcast("orchestrator_decision", "{\"decision\":\"" + escape(decision) + "\"}");
    }

    public void broadcastJobStatus(String jobId, String status) {
        broadcast("job_status", "{\"jobId\":\"" + jobId + "\",\"status\":\"" + status + "\"}");
    }

    public void broadcastJobLog(String jobId, String level, String message) {
        broadcast("job_log", "{\"jobId\":\"" + jobId + "\",\"level\":\"" + level + "\",\"message\":\"" + escape(message) + "\"}");
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
```
（`ResponseBodyEmitter` 而非 SseEmitter——与现有 StreamingResponseBody 风格一致，直接写字节。JSON 转义简化，生产可换 ObjectMapper。）

- [ ] **Step 2: 接入广播点**

- `CrawlOrchestratorStateService.record_decision`（python 上报决策时）末尾调 `broadcaster.broadcastDecision(decision)`——注入 `CrawlSseBroadcaster`。
- `CrawlJobService` 各状态 mutator（startJob/pauseJob/cancelJob/completeJob/failJob）末尾调 `broadcaster.broadcastJobStatus(jobId, status.name())`。
- `CrawlJobLogService.append` 末尾调 `broadcaster.broadcastJobLog(jobId, level, message)`。

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlSseBroadcaster.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlOrchestratorStateService.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlJobService.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/crawl/CrawlJobLogService.java
git commit -m "feat(crawl): CrawlSseBroadcaster + 决策/状态/日志广播接入"
```

---

## Task 11: CrawlStreamController（SSE 端点）

**Files:**
- Create: `.../controller/crm/CrawlStreamController.java`

> `GET /api/content/crm/crawl/stream` 返回 SSE 流。admin 门（AuthRoleSupport）。仿 AgentStreamController StreamingResponseBody。

- [ ] **Step 1: 写控制器**

```java
package cn.novelstudio.module.content.controller.crm;

import cn.novelstudio.module.content.service.crawl.CrawlSseBroadcaster;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/content/crm/crawl")
@RequiredArgsConstructor
public class CrawlStreamController extends BaseController {

    private final CrawlSseBroadcaster broadcaster;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<StreamingResponseBody> stream(
        @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        AuthRoleSupport.requireAdmin(roles);
        org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter emitter = broadcaster.register();
        StreamingResponseBody body = out -> {
            // 初始 connected 帧
            out.write("event: connected\ndata: {}\n\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            out.flush();
            // emitter 由 broadcaster 写入；此 body 阻塞直到 emitter 完成
            // ResponseBodyEmitter 与 StreamingResponseBody 桥接：用 emitter 写入底层
            // 简化：直接返回 emitter 适配
            try { Thread.sleep(Long.MAX_VALUE); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        };
        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_EVENT_STREAM)
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .header("X-Accel-Buffering", "no")
            .body(body);
    }
}
```
（**注**：ResponseBodyEmitter + StreamingResponseBody 混用复杂。更干净：直接返回 `ResponseBodyEmitter`（Spring MVC 原生支持 SSE emitter 返回），不包 StreamingResponseBody。改：）
```java
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseBodyEmitter stream(
        @RequestHeader(value = "X-User-Roles", required = false) String roles
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return broadcaster.register();
    }
```
（Spring MVC 自动把 `ResponseBodyEmitter` 返回 + `produces=TEXT_EVENT_STREAM` 当 SSE 流处理。去掉 StreamingResponseBody 包装。用此简洁版。）

- [ ] **Step 2: 编译 + 验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```
`_restart-dev-stack.ps1`，curl 测 SSE（需 admin JWT cookie）：
```bash
curl -N -H "Cookie: <admin-cookie>" http://127.0.0.1:8080/api/content/crm/crawl/stream
```
Expected: `event: connected` 后挂起；触发决策/状态变更时推送 `orchestrator_decision`/`job_status`。

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/crm/CrawlStreamController.java
git commit -m "feat(crawl): CrawlStreamController SSE /stream 端点"
```

---

## Task 12（可选）: CRM admin 门接入现有端点

**Files:**
- Modify: `CrmCrawlController.java` + `CrmCatalogController.java`

> 现有 CRM crawl 端点无 admin 角色门。补 `AuthRoleSupport.requireAdmin(X-User-Roles)` 到各端点（与 §3 一致）。若范围控制，仅补关键写端点（createJob/startJob/setGoal/wake/clear）。

- [ ] **Step 1: 各写端点加 requireAdmin**

`CrmCrawlController` createJob/startJob/pauseJob/cancelJob/deleteJob/createSite/updateSite 加 `@RequestHeader(value="X-User-Roles", required=false) String roles` + `AuthRoleSupport.requireAdmin(roles)`。
`CrmCatalogController` setGoal/wake/clear 加同样。

- [ ] **Step 2: 编译 + 提交**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/crm/
git commit -m "feat(crawl): CRM crawl 端点补 admin 角色门"
```

---

Part 2 完成。→ 继续 [Part 3 — python daemon](./2026-06-19-crawler-part3-python.md)
