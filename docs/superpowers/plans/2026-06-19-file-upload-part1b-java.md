# Part 1b — Java 后端实现计划（续）

> 主索引：[2026-06-19-file-upload.md](./2026-06-19-file-upload.md) ｜ [Part 1a](./2026-06-19-file-upload-part1a-java.md)
> 设计：[spec](../specs/2026-06-19-file-upload-design.md)

**约定**：包根 `cn.novelstudio.module.content` 等；Java 21；`mvn -pl <module> -am test` 需 `JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试再实现。

---

## Task 7: EffectiveQuotaSupport.resolveLibraryUploadLimit + FeatureGateBiz.getFeatureLimit

**Files:**
- Modify: `novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/support/EffectiveQuotaSupport.java`
- Modify: `novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/FeatureGateBiz.java`
- Modify: `novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/repository/PlanFeatureRepository.java`（若需加查询方法）
- Test: `novel-studio/studio-modules/studio-module-billing/src/test/java/cn/novelstudio/module/billing/support/EffectiveQuotaSupportTest.java`

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.billing.support;

import cn.novelstudio.module.billing.entity.ProductPlanEntity;
import cn.novelstudio.module.billing.entity.UserQuotaOverrideEntity;
import cn.novelstudio.module.billing.repository.UserQuotaOverrideRepository;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class EffectiveQuotaSupportTest {

    @Test
    void resolveLibraryUploadLimit_planLimit_plus_bonuses() {
        UserQuotaOverrideRepository repo = mock(UserQuotaOverrideRepository.class);
        UserQuotaOverrideEntity o = new UserQuotaOverrideEntity();
        o.setLibraryUploadBonus(3);
        when(repo.findActiveByUserId(eq(10L), any())).thenReturn(List.of(o));
        EffectiveQuotaSupport support = new EffectiveQuotaSupport(repo);

        ProductPlanEntity plan = new ProductPlanEntity();
        // plan 自身无上传限额字段；限额来自 plan_feature.limit_value，由 FeatureGateBiz 读
        // 这里测 EffectiveQuotaSupport 汇总 override bonus
        Integer limit = support.resolveLibraryUploadLimit(10L, 5); // planLimit=5
        assertThat(limit).isEqualTo(8); // 5 + 3
    }

    @Test
    void resolveLibraryUploadLimit_nullPlanLimit_meansUnlimited() {
        UserQuotaOverrideRepository repo = mock(UserQuotaOverrideRepository.class);
        when(repo.findActiveByUserId(anyLong(), any())).thenReturn(List.of());
        EffectiveQuotaSupport support = new EffectiveQuotaSupport(repo);
        Integer limit = support.resolveLibraryUploadLimit(10L, null); // null=无限
        assertThat(limit).isNull();
    }
}
```
（`eq`/`anyLong`/`any` 来自 `org.mockito.ArgumentMatchers`，import 之。）

- [ ] **Step 2: 跑测试验证失败**（方法不存在）

- [ ] **Step 3: EffectiveQuotaSupport 加方法**

在 `EffectiveQuotaSupport` 类内加：
```java
    /** 私人书库上传限额 = plan_feature.limit_value + Σ override.library_upload_bonus；null=无限 */
    public Integer resolveLibraryUploadLimit(long userId, Integer planFeatureLimit) {
        if (planFeatureLimit == null) return null;
        List<UserQuotaOverrideEntity> overrides = userQuotaOverrideRepository.findActiveByUserId(userId, Instant.now());
        int bonus = 0;
        for (UserQuotaOverrideEntity o : overrides) {
            bonus += o.getLibraryUploadBonus() == null ? 0 : o.getLibraryUploadBonus();
        }
        return planFeatureLimit + bonus;
    }
```

- [ ] **Step 4: PlanFeatureRepository 加查询（取 limit_value）**

在 `PlanFeatureRepository` 接口加：
```java
    @Query("SELECT f.limitValue FROM PlanFeatureEntity f WHERE f.planId = :planId AND f.featureKey = :key AND f.enabled = true")
    java.util.Optional<Integer> findLimitValueByPlanAndKey(Long planId, String key);
```

- [ ] **Step 5: FeatureGateBiz 加 getFeatureLimit**

在 `FeatureGateBiz` 类内加：
```java
    private final EffectiveQuotaSupport effectiveQuotaSupport;
    // 注意：FeatureGateBiz 现有构造注入 SubscriptionBiz + PlanFeatureRepository；
    // 改 @RequiredArgsConstructor 自动加 effectiveQuotaSupport 字段（加为 final 字段）

    /** 取某用户某 feature 的限额值（null=无限/不适用）。 */
    public Integer getFeatureLimit(long userId, String featureKey) {
        var plan = subscriptionBiz.resolvePlanForUser(userId);
        Integer planLimit = planFeatureRepository.findLimitValueByPlanAndKey(plan.getId(), featureKey).orElse(null);
        return effectiveQuotaSupport.resolveLibraryUploadLimit(userId, planLimit);
    }
```
（`FeatureGateBiz` 现为 `@RequiredArgsConstructor`，把 `effectiveQuotaSupport` 加为 `private final` 字段即可注入。）

- [ ] **Step 6: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am test -Dtest=EffectiveQuotaSupportTest
```
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/
git commit -m "feat(upload): 配额解析—resolveLibraryUploadLimit + getFeatureLimit"
```

---

## Task 8: AuthRoleSupport admin 校验

**Files:**
- Create: `novel-studio/studio-platform/studio-platform-web/src/main/java/cn/novelstudio/platform/web/AuthRoleSupport.java`
- Test: `novel-studio/studio-platform/studio-platform-web/src/test/java/cn/novelstudio/platform/web/AuthRoleSupportTest.java`

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.platform.web;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRoleSupportTest {

    @Test
    void parseRoles_splitsByComma() {
        assertThat(AuthRoleSupport.parseRoles("user,admin")).contains("admin", "user");
    }

    @Test
    void requireAdmin_passes_whenAdminPresent() {
        AuthRoleSupport.requireAdmin("user,admin"); // no throw
    }

    @Test
    void requireAdmin_throws_whenAdminAbsent() {
        assertThatThrownBy(() -> AuthRoleSupport.requireAdmin("user"))
            .isInstanceOf(cn.novelstudio.kernel.exception.BizException.class);
    }

    @Test
    void requireAdmin_throws_whenNull() {
        assertThatThrownBy(() -> AuthRoleSupport.requireAdmin(null))
            .isInstanceOf(cn.novelstudio.kernel.exception.BizException.class);
    }
}
```
（确认 `BizException` 包路径：`cn.novelstudio.kernel.exception.BizException`——查 `BaseBiz` import 核实；若不同按实际。）

- [ ] **Step 2: 跑测试验证失败**

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

    public static void requireAdmin(String rolesHeader) {
        if (!parseRoles(rolesHeader).contains("admin")) {
            throw BizException.of(ResultCode.FORBIDDEN);
        }
    }
}
```
（核实 `ResultCode.FORBIDDEN` 存在；若实际为 `FORBIDDEN_ACCESS` 等按 codebase 实际枚举改。运行 `grep -n "FORBIDDEN" novel-studio/studio-kernel/.../ResultCode.java` 确认。）

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
git commit -m "feat(upload): AuthRoleSupport admin 角色手动校验"
```

---

## Task 9: UploadService（落盘/元数据/查进度/删/配额检查）

**Files:**
- Create: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/UploadService.java`
- Create: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/dto/UploadFileDTO.java`
- Test: `novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/service/UploadServiceTest.java`

> 注意：UploadService 依赖 `IMessageProducer`（发 MQ，Part2 Task 13 定义 `MqTopic.FILE_PARSE` + `FileParseMessage`）、`StorageBackend`、`UploadedFileRepository`、`CrawlCatalogNovelRepository`、`StringRedisTemplate`（读进度）。本任务先写能编译的版本，MQ 发送用 `ObjectProvider<IMessageProducer>` 可选注入（若 Part2 未完成则跳过发送，仅 pending）。

- [ ] **Step 1: 写 UploadFileDTO**

```java
package cn.novelstudio.module.content.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadFileDTO {
    private String fileId;
    private String status;        // pending|parsing|ready|failed
    private Integer progress;     // 0-100（parsing 时来自 Redis）
    private String originalName;
    private Long sizeBytes;
    private String format;
    private String parseError;
    private String catalogNovelId;
    private Long createdAt;
}
```

- [ ] **Step 2: 写失败测试**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.entity.UploadedFileEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import cn.novelstudio.module.content.repository.UploadedFileRepository;
import cn.novelstudio.module.content.storage.StorageBackend;
import cn.novelstudio.module.content.storage.UploadStorageProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class UploadServiceTest {

    UploadedFileRepository fileRepo;
    CrawlCatalogNovelRepository catalogRepo;
    StorageBackend storage;
    UploadStorageProperties props;
    ObjectProvider<cn.novelstudio.platform.messaging.producer.IMessageProducer> producerProvider;
    StringRedisTemplate redis;
    UploadService svc;

    @BeforeEach void setup(@TempDir Path tmp) {
        fileRepo = mock(UploadedFileRepository.class);
        catalogRepo = mock(CrawlCatalogNovelRepository.class);
        storage = mock(StorageBackend.class);
        props = new UploadStorageProperties();
        props.setStorageDir(tmp.toString());
        producerProvider = mock(ObjectProvider.class);
        when(producerProvider.getIfAvailable()).thenReturn(null);
        redis = mock(StringRedisTemplate.class);
        svc = new UploadService(fileRepo, catalogRepo, storage, props, producerProvider, redis);
    }

    @Test
    void resolveFormat_lowercasesExtension() {
        assertThat(svc.resolveFormat("Book.EPUB")).isEqualTo("epub");
    }

    @Test
    void resolveFormat_rejectsUnknown() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> svc.resolveFormat("a.zip"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void buildStorageKey_isDatedWithUuid_noOriginalName() {
        String key = svc.buildStorageKey("my book.epub");
        // 形如 2026/06/19/<uuid>.epub，不含原始名
        assertThat(key).matches("\\d{4}/\\d{2}/\\d{2}/[\\w-]+\\.epub");
        assertThat(key).doesNotContain("my book");
    }
}
```

- [ ] **Step 3: 跑测试验证失败**

- [ ] **Step 4: 写 UploadService**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.UploadFileDTO;
import cn.novelstudio.module.content.entity.UploadedFileEntity;
import cn.novelstudio.module.content.repository.CrawlCatalogNovelRepository;
import cn.novelstudio.module.content.repository.UploadedFileRepository;
import cn.novelstudio.module.content.storage.StorageBackend;
import cn.novelstudio.module.content.storage.UploadStorageProperties;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.platform.messaging.upload.FileParseMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class UploadService {

    private static final Duration PROGRESS_TTL = Duration.ofHours(1);

    private final UploadedFileRepository fileRepo;
    private final CrawlCatalogNovelRepository catalogRepo;
    private final StorageBackend storage;
    private final UploadStorageProperties props;
    private final ObjectProvider<IMessageProducer> producerProvider;
    private final StringRedisTemplate redis;

    public UploadService(UploadedFileRepository fileRepo, CrawlCatalogNovelRepository catalogRepo,
                         StorageBackend storage, UploadStorageProperties props,
                         ObjectProvider<IMessageProducer> producerProvider, StringRedisTemplate redis) {
        this.fileRepo = fileRepo; this.catalogRepo = catalogRepo;
        this.storage = storage; this.props = props;
        this.producerProvider = producerProvider; this.redis = redis;
    }

    public String resolveFormat(String originalName) {
        int dot = originalName.lastIndexOf('.');
        if (dot < 0) throw new IllegalArgumentException("缺少文件扩展名");
        String ext = originalName.substring(dot + 1).toLowerCase();
        if (!props.getAllowedFormats().contains(ext)) {
            throw new IllegalArgumentException("不支持的格式: " + ext);
        }
        // markdown -> md 归一
        return "markdown".equals(ext) ? "md" : ext;
    }

    public String buildStorageKey(String originalName) {
        String ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
        String date = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        return date + "/" + UUID.randomUUID() + "." + ext;
    }

    /** 落盘 + 写元数据(pending) + 发 MQ。返回 fileId。 */
    public String createUpload(Long ownerId, String ownerType, String originalName,
                               String mimeType, long size, java.io.InputStream in, String format) {
        String key = buildStorageKey(originalName);
        storage.save(in, key);
        UploadedFileEntity e = new UploadedFileEntity();
        e.setOwnerId(ownerId); e.setOwnerType(ownerType);
        e.setOriginalName(originalName); e.setStorageKey(key);
        e.setMimeType(mimeType); e.setSizeBytes(size); e.setFormat(format);
        e.setStatus("pending");
        e = fileRepo.save(e);
        setProgress(e.getId(), 0);
        publishParse(e.getId(), ownerId, ownerType, key, format, originalName);
        return e.getId();
    }

    void publishParse(String fileId, Long ownerId, String ownerType, String key, String format, String name) {
        IMessageProducer producer = producerProvider.getIfAvailable();
        if (producer == null) return; // MQ 未启用则保持 pending
        producer.send(MqTopic.FILE_PARSE, new FileParseMessage(fileId, ownerId, ownerType, key, format, name));
    }

    public void setProgress(String fileId, int pct) {
        redis.opsForValue().set("parse:progress:" + fileId, String.valueOf(pct), PROGRESS_TTL);
    }

    public Integer getProgress(String fileId) {
        String v = redis.opsForValue().get("parse:progress:" + fileId);
        if (v == null) return null;
        try { return Integer.parseInt(v); } catch (NumberFormatException e) { return null; }
    }

    public UploadFileDTO toDto(UploadedFileEntity e) {
        Integer progress = "parsing".equals(e.getStatus()) ? getProgress(e.getId()) : null;
        if ("ready".equals(e.getStatus())) progress = 100;
        if ("pending".equals(e.getStatus())) progress = 0;
        return new UploadFileDTO(e.getId(), e.getStatus(), progress, e.getOriginalName(),
            e.getSizeBytes(), e.getFormat(), e.getParseError(), e.getCatalogNovelId(),
            e.getCreatedAt() == null ? null : e.getCreatedAt().toEpochMilli());
    }

    public UploadedFileEntity requireOwned(String fileId, Long ownerId, String ownerType) {
        UploadedFileEntity e = fileRepo.findById(fileId)
            .orElseThrow(() -> new IllegalArgumentException("文件不存在"));
        // admin 可访问全部；user 只能访问自己的
        if ("user".equals(ownerType) && !java.util.Objects.equals(e.getOwnerId(), ownerId)) {
            throw new IllegalArgumentException("无权访问该文件");
        }
        return e;
    }

    public void delete(UploadedFileEntity e) {
        storage.delete(e.getStorageKey());
        fileRepo.delete(e);
        // 已解析的 catalog 保留（不级联）
    }
}
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=UploadServiceTest
```
Expected: PASS。（注意：此时 `MqTopic.FILE_PARSE` / `FileParseMessage` 尚未定义——本任务编译会失败。**调整执行顺序**：先做 Part2 Task 13（定义 MqTopic + FileParseMessage）再回来，或在本任务先建空 `FileParseMessage` record + `MqTopic.FILE_PARSE` 占位。**推荐**：把 Part2 Task 13 提前到此任务之前执行。）

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/UploadService.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/dto/UploadFileDTO.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/service/UploadServiceTest.java
git commit -m "feat(upload): UploadService—落盘/元数据/进度/删除（依赖 MqTopic.FILE_PARSE）"
```

---

## Task 10: AuthUploadBiz + AuthUploadController（用户端点）

**Files:**
- Create: `.../service/auth/biz/AuthUploadBiz.java`
- Create: `.../controller/auth/AuthUploadController.java`

- [ ] **Step 1: 写 AuthUploadBiz**

```java
package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.module.content.dto.UploadFileDTO;
import cn.novelstudio.module.content.entity.UploadedFileEntity;
import cn.novelstudio.module.content.repository.UploadedFileRepository;
import cn.novelstudio.module.content.service.UploadService;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.result.Page;
import cn.novelstudio.kernel.result.Result;
import cn.novelstudio.kernel.result.ResultCode;
import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AuthUploadBiz extends BaseBiz {

    private final UploadService uploadService;
    private final UploadedFileRepository fileRepo;
    private final FeatureGateBiz featureGateBiz;

    public Result<UploadFileDTO> upload(Long userId, String originalName, String mimeType,
                                        long size, java.io.InputStream in) {
        // 配额检查
        Integer limit = featureGateBiz.getFeatureLimit(userId, "library_upload_limit");
        long used = fileRepo.countActiveByOwner(userId);
        if (limit != null && used >= limit) {
            throw cn.novelstudio.kernel.exception.BizException.of(
                ResultCode.BILLING_QUOTA_EXCEEDED,
                Map.of("limit", limit, "used", used));
        }
        String format = uploadService.resolveFormat(originalName);
        String fileId = uploadService.createUpload(userId, "user", originalName, mimeType, size, in, format);
        UploadedFileEntity e = fileRepo.findById(fileId).orElseThrow();
        return ok(uploadService.toDto(e));
    }

    public Result<Page<UploadFileDTO>> list(Long userId, int pageCurrent, int pageSize) {
        var page = fileRepo.findByOwnerIdOrderByCreatedAtDesc(userId,
            PageRequest.of(Math.max(0, pageCurrent - 1), pageSize));
        return ok(cn.novelstudio.kernel.support.SpringPageSupport.map(page, uploadService::toDto, pageCurrent, pageSize));
    }

    public Result<UploadFileDTO> get(Long userId, String fileId) {
        UploadedFileEntity e = uploadService.requireOwned(fileId, userId, "user");
        return ok(uploadService.toDto(e));
    }

    public Result<Void> delete(Long userId, String fileId) {
        UploadedFileEntity e = uploadService.requireOwned(fileId, userId, "user");
        uploadService.delete(e);
        return ok();
    }

    public Result<Map<String, Object>> quota(Long userId) {
        Integer limit = featureGateBiz.getFeatureLimit(userId, "library_upload_limit");
        long used = fileRepo.countActiveByOwner(userId);
        Integer remaining = limit == null ? null : Math.max(0, limit - (int) used);
        return ok(Map.of("limit", limit == null ? "unlimited" : limit, "used", used, "remaining", remaining == null ? "unlimited" : remaining));
    }

    public Result<UploadFileDTO> retry(Long userId, String fileId) {
        UploadedFileEntity e = uploadService.requireOwned(fileId, userId, "user");
        e.setStatus("pending"); e.setParseError(null);
        fileRepo.save(e);
        uploadService.publishParse(e.getId(), userId, "user", e.getStorageKey(), e.getFormat(), e.getOriginalName());
        return ok(uploadService.toDto(e));
    }
}
```
（核实 `SpringPageSupport` 包路径 `cn.novelstudio.kernel.support.SpringPageSupport`——按 `AuthCatalogBiz` 实际 import；`ResultCode.BILLING_QUOTA_EXCEEDED` 存在；`BizException.of(code, map)` 重载是否存在——若只支持 `BizException.of(code)`，则改用 `BizException.of(ResultCode.BILLING_QUOTA_EXCEEDED)` + 在 message 体现。运行前 grep 确认。）

- [ ] **Step 2: 写 AuthUploadController**

```java
package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.module.content.dto.UploadFileDTO;
import cn.novelstudio.module.content.service.auth.biz.AuthUploadBiz;
import cn.novelstudio.kernel.result.Page;
import cn.novelstudio.kernel.result.Result;
import cn.novelstudio.platform.web.BaseController;
import cn.novelstudio.platform.web.AuthRoleSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/content/auth/upload")
@RequiredArgsConstructor
public class AuthUploadController extends BaseController {

    private final AuthUploadBiz biz;

    @PostMapping("/file")
    public Result<UploadFileDTO> upload(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "title", required = false) String title
    ) throws IOException {
        return biz.upload(parseUserId(userId),
            file.getOriginalFilename(), file.getContentType(),
            file.getSize(), file.getInputStream());
    }

    @GetMapping("/files")
    public Result<Page<UploadFileDTO>> list(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return biz.list(parseUserId(userId), pageCurrent, pageSize);
    }

    @GetMapping("/files/{fileId}")
    public Result<UploadFileDTO> get(@RequestHeader("X-User-Id") String userId,
                                     @PathVariable String fileId) {
        return biz.get(parseUserId(userId), fileId);
    }

    @DeleteMapping("/files/{fileId}")
    public Result<Void> delete(@RequestHeader("X-User-Id") String userId,
                               @PathVariable String fileId) {
        return biz.delete(parseUserId(userId), fileId);
    }

    @PostMapping("/files/{fileId}/retry")
    public Result<UploadFileDTO> retry(@RequestHeader("X-User-Id") String userId,
                                       @PathVariable String fileId) {
        return biz.retry(parseUserId(userId), fileId);
    }

    @GetMapping("/quota")
    public Result<Map<String, Object>> quota(@RequestHeader("X-User-Id") String userId) {
        return biz.quota(parseUserId(userId));
    }
}
```

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/auth/biz/AuthUploadBiz.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/auth/AuthUploadController.java
git commit -m "feat(upload): 用户上传端点—/api/content/auth/upload/*（含配额检查）"
```

---

## Task 11: CrmUploadController（管理员端点）

**Files:**
- Create: `.../controller/crm/CrmUploadController.java`

- [ ] **Step 1: 写 CrmUploadController**

```java
package cn.novelstudio.module.content.controller.crm;

import cn.novelstudio.module.content.dto.UploadFileDTO;
import cn.novelstudio.module.content.entity.UploadedFileEntity;
import cn.novelstudio.module.content.repository.UploadedFileRepository;
import cn.novelstudio.module.content.service.UploadService;
import cn.novelstudio.kernel.result.Page;
import cn.novelstudio.kernel.result.Result;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content/crm/upload")
@RequiredArgsConstructor
public class CrmUploadController extends BaseController {

    private final UploadService uploadService;
    private final UploadedFileRepository fileRepo;

    @PostMapping("/file")
    public Result<UploadFileDTO> upload(
        @RequestHeader("X-User-Id") String userId,
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam("file") MultipartFile file
    ) throws IOException {
        AuthRoleSupport.requireAdmin(roles); // 403 if not admin
        String format = uploadService.resolveFormat(file.getOriginalFilename());
        String fileId = uploadService.createUpload(null, "admin", file.getOriginalFilename(),
            file.getContentType(), file.getSize(), file.getInputStream(), format);
        UploadedFileEntity e = fileRepo.findById(fileId).orElseThrow();
        return ok(uploadService.toDto(e));
    }

    @GetMapping("/files")
    public Result<Page<UploadFileDTO>> list(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        AuthRoleSupport.requireAdmin(roles);
        var page = fileRepo.findAll(org.springframework.data.domain.PageRequest.of(
            Math.max(0, pageCurrent - 1), pageSize,
            org.springframework.data.domain.Sort.by("createdAt").descending()));
        return ok(cn.novelstudio.kernel.support.SpringPageSupport.map(page, uploadService::toDto, pageCurrent, pageSize));
    }

    @DeleteMapping("/files/{fileId}")
    public Result<Void> delete(@RequestHeader(value = "X-User-Roles", required = false) String roles,
                               @PathVariable String fileId) {
        AuthRoleSupport.requireAdmin(roles);
        UploadedFileEntity e = fileRepo.findById(fileId).orElseThrow();
        uploadService.delete(e);
        return ok();
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
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/crm/CrmUploadController.java
git commit -m "feat(upload): 管理员上传端点—/api/content/crm/upload/*（admin 角色门）"
```

---

## Task 12: CatalogService.collectToMyLibrary 轻引用

**Files:**
- Modify: `novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/catalog/CatalogService.java`
- Modify: `.../controller/auth/AuthCatalogController.java`（加端点）
- Modify: `.../service/auth/biz/AuthCatalogBiz.java`（加方法）

- [ ] **Step 1: CatalogService 加 collectToMyLibrary**

在 `CatalogService` 加方法（复制公共条目为 owner_id=userId 的轻引用，不复制章节）：
```java
    @Transactional
    public String collectToMyLibrary(Long userId, String catalogNovelId) {
        // 已收藏则幂等返回
        return catalogNovelRepository.findByOwnerAndUploaderFile(userId, null)
            .stream().findFirst().map(CrawlCatalogNovelEntity::getId).orElseGet(() -> {
                // 简化：按 (ownerId, 原 id 关联) 查重需额外字段。此处用 source_url 携带原 id 关联。
                // 更清晰方案：加收藏关系表。为控制范围，此处用 source_url 存原 catalogNovelId。
                CrawlCatalogNovelEntity src = catalogNovelRepository.findById(catalogNovelId)
                    .orElseThrow(() -> new IllegalArgumentException("书库条目不存在"));
                // 查重：我的书库中是否已收藏该原条目（source_url = 原 id 且 owner_id=userId）
                // 由于 findByOwnerAndUploaderFile 不适用，改用 source_url 模糊查重不可靠。
                // **改进**：collectToMyLibrary 直接复用 crawl_catalog_novel.owner_id 标记，
                // 但公共条目 owner_id=null。为支持"一人收藏一份"，需新建轻量关系表 user_library_collection。
                // —— 见下方 Step 2 调整。
                return null;
            });
    }
```
**发现问题**：轻引用若直接在 crawl_catalog_novel 复制行，需查重机制。原 spec 说"不克隆章节正文，仅引用 catalog_novel_id"——最干净是**新建 `user_library_collection(user_id, catalog_novel_id)` 关系表**，"我的书库"= 该表 join crawl_catalog_novel。这比复制行更清晰，避免 catalog 表膨胀。

- [ ] **Step 2: 调整方案——新建收藏关系表**

在 V15 迁移补充（或新建 V16）：
```sql
CREATE TABLE IF NOT EXISTS user_library_collection (
    user_id          BIGINT NOT NULL,
    catalog_novel_id VARCHAR(36) NOT NULL,
    collected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, catalog_novel_id)
);
```
新建 `UserLibraryCollectionEntity`（`@IdClass` 复合主键或 `@EmbeddedId`）+ `UserLibraryCollectionRepository`。

- [ ] **Step 3: 重写 collectToMyLibrary 用关系表**

```java
    @Transactional
    public void collectToMyLibrary(Long userId, String catalogNovelId) {
        if (!catalogNovelRepository.existsById(catalogNovelId)) {
            throw new IllegalArgumentException("书库条目不存在");
        }
        if (!collectionRepo.existsById(new UserLibraryCollectionPk(userId, catalogNovelId))) {
            UserLibraryCollectionEntity c = new UserLibraryCollectionEntity();
            c.setUserId(userId); c.setCatalogNovelId(catalogNovelId);
            collectionRepo.save(c);
        }
        // 幂等：已存在则不重复
    }
```

- [ ] **Step 4: "我的书库"列表 = 收藏表 join catalog**

```java
    public Page<CatalogNovelDTO> myLibrary(Long userId, int pageCurrent, int pageSize) {
        // 查 user_library_collection WHERE user_id，join crawl_catalog_novel
        Pageable pageable = PageRequest.of(Math.max(0, pageCurrent - 1), pageSize);
        // repo 用 @Query join
        return catalogNovelRepository.findMyLibrary(userId, pageable).map(this::toDTO);
    }
```
`CrawlCatalogNovelRepository` 加：
```java
    @Query("SELECT n FROM CrawlCatalogNovelEntity n WHERE n.id IN (SELECT c.catalogNovelId FROM UserLibraryCollectionEntity c WHERE c.userId = :userId) ORDER BY n.updatedAt DESC")
    Page<CrawlCatalogNovelEntity> findMyLibrary(Long userId, Pageable pageable);
```
**注意**："我的书库"还要包含用户自己上传的（owner_id=userId, source=upload）。所以 myLibrary 应 UNION 上传来的：
```java
    @Query("""
        SELECT n FROM CrawlCatalogNovelEntity n
        WHERE n.ownerId = :userId
           OR n.id IN (SELECT c.catalogNovelId FROM UserLibraryCollectionEntity c WHERE c.userId = :userId)
        ORDER BY n.updatedAt DESC
        """)
    Page<CrawlCatalogNovelEntity> findMyLibrary(Long userId, Pageable pageable);
```

- [ ] **Step 5: AuthCatalogController + Biz 加端点**

AuthCatalogController 加：
```java
    @PostMapping("/novels/{catalogNovelId}/collect")
    public Result<Void> collect(@RequestHeader("X-User-Id") String userId,
                                @PathVariable String catalogNovelId) {
        return biz.collect(parseUserId(userId), catalogNovelId);
    }

    @GetMapping("/my-library")
    public Result<Page<CatalogNovelDTO>> myLibrary(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(defaultValue = "1") int pageCurrent,
        @RequestParam(defaultValue = "20") int pageSize) {
        return biz.myLibrary(parseUserId(userId), pageCurrent, pageSize);
    }
```
AuthCatalogBiz 加对应薄方法委托 catalogService。

- [ ] **Step 6: 编译 + 验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 7: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/
git commit -m "feat(upload): 我的书库收藏关系表 + collectToMyLibrary + my-library 列表"
```

---

Part 1 完成。继续 [Part 2a — MQ + python-ai](./2026-06-19-file-upload-part2a-mq-python.md)。
