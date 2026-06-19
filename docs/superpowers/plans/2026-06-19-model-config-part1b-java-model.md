# Part 1b — Java 模型目录（续）

> 主索引：[2026-06-19-model-config.md](./2026-06-19-model-config.md) ｜ [Part 1a](./2026-06-19-model-config-part1-java-model.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 6: AiModelService（CRUD+套餐+默认+加密）

**Files:**
- Create: `.../service/AiModelService.java`
- Create: `.../dto/AiModelDTO.java`、`.../dto/AiModelUpsertReq.java`
- Test: `.../service/AiModelServiceTest.java`

> service 封装：CRUD（key 加密落盘/更新时空保留旧值）、套餐关联全量覆盖、设默认（同 type 互斥）、maskKey 掩码、toDto（不含明文 key）。

- [ ] **Step 1: 写 DTO**

```java
package cn.novelstudio.module.content.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class AiModelDTO {
    private String id;
    private String code;
    private String displayName;
    private String modelType;
    private String provider;
    private String protocol;
    private String modelName;
    private String baseUrl;
    private String apiKeyMasked;          // sk-****1234
    private Integer maxTokens;
    private Double temperature;
    private Long inputPricePer1kMicros;
    private Long outputPricePer1kMicros;
    private BigDecimal priceMultiplier;
    private Boolean active;
    private Boolean isDefault;
    private Integer sortOrder;
    private String description;
    private List<String> planCodes;        // 关联套餐
}

@Data
class AiModelUpsertReq {
    private String code;
    private String displayName;
    private String modelType;
    private String provider;
    private String protocol;
    private String modelName;
    private String baseUrl;
    private String apiKey;                 // 明文，空=更新时保留
    private Integer maxTokens;
    private Double temperature;
    private Long inputPricePer1kMicros;
    private Long outputPricePer1kMicros;
    private BigDecimal priceMultiplier;
    private Boolean active;
    private Integer sortOrder;
    private String description;
}
```
（`AiModelUpsertReq` 改为 `public`，单独文件或同包——按 codebase 习惯一个 DTO 一文件，此处简化合并展示，实现时拆 public 类。）

- [ ] **Step 2: 写失败测试**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.AiModelDTO;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.repository.AiModelPlanAccessRepository;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiModelServiceTest {

    @Mock AiModelRepository repo;
    @Mock AiModelPlanAccessRepository planRepo;
    @Mock ModelKeyCodec keyCodec;
    @InjectMocks AiModelService svc;

    @Test
    void create_encryptsKey_andMasksInDto() {
        when(keyCodec.encrypt("sk-plain")).thenReturn("ENC");
        when(keyCodec.decrypt("ENC")).thenReturn("sk-plain");
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var req = new cn.novelstudio.module.content.dto.AiModelUpsertReq();
        req.setCode("gpt-4o"); req.setDisplayName("GPT-4o"); req.setModelType("llm");
        req.setProvider("openai"); req.setProtocol("openai"); req.setModelName("gpt-4o");
        req.setBaseUrl("https://x"); req.setApiKey("sk-plain"); req.setPriceMultiplier(BigDecimal.ONE);
        AiModelDTO dto = svc.create(req);
        verify(keyCodec).encrypt("sk-plain");
        assertThat(dto.getApiKeyMasked()).startsWith("sk-").endsWith("lain").contains("*");
    }

    @Test
    void setDefault_clearsOtherDefaultsSameType() {
        AiModelEntity old = new AiModelEntity();
        old.setId("old"); old.setModelType("llm"); old.setIsDefault(true);
        when(repo.findFirstByModelTypeAndIsDefaultTrueAndIsActiveTrue("llm")).thenReturn(Optional.of(old));
        AiModelEntity target = new AiModelEntity();
        target.setId("t"); target.setModelType("llm");
        when(repo.findById("t")).thenReturn(Optional.of(target));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        svc.setDefault("t");
        assertThat(old.getIsDefault()).isFalse();
        assertThat(target.getIsDefault()).isTrue();
    }
}
```

- [ ] **Step 3: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=AiModelServiceTest
```

- [ ] **Step 4: 写 AiModelService**

```java
package cn.novelstudio.module.content.service;

import cn.novelstudio.module.content.dto.AiModelDTO;
import cn.novelstudio.module.content.dto.AiModelUpsertReq;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.entity.AiModelPlanAccessEntity;
import cn.novelstudio.module.content.repository.AiModelPlanAccessRepository;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiModelService {

    private final AiModelRepository repo;
    private final AiModelPlanAccessRepository planRepo;
    private final ModelKeyCodec keyCodec;

    @Transactional
    public AiModelDTO create(AiModelUpsertReq req) {
        AiModelEntity e = new AiModelEntity();
        applyReq(e, req, true);
        e.setIsDefault(false);
        return toDto(repo.save(e));
    }

    @Transactional
    public AiModelDTO update(String id, AiModelUpsertReq req) {
        AiModelEntity e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        applyReq(e, req, false); // apiKey 空=保留
        return toDto(repo.save(e));
    }

    private void applyReq(AiModelEntity e, AiModelUpsertReq req, boolean keyRequired) {
        e.setCode(req.getCode()); e.setDisplayName(req.getDisplayName());
        e.setModelType(req.getModelType()); e.setProvider(req.getProvider());
        e.setProtocol(req.getProtocol()); e.setModelName(req.getModelName());
        e.setBaseUrl(req.getBaseUrl());
        if (req.getApiKey() != null && !req.getApiKey().isEmpty()) {
            e.setApiKeyEnc(keyCodec.encrypt(req.getApiKey()));
        } else if (keyRequired) {
            throw new IllegalArgumentException("apiKey 必填");
        }
        e.setMaxTokens(req.getMaxTokens()); e.setTemperature(req.getTemperature());
        e.setInputPricePer1kMicros(req.getInputPricePer1kMicros());
        e.setOutputPricePer1kMicros(req.getOutputPricePer1kMicros());
        e.setPriceMultiplier(req.getPriceMultiplier() != null ? req.getPriceMultiplier() : java.math.BigDecimal.ONE);
        e.setActive(req.getActive() == null || req.getActive());
        e.setSortOrder(req.getSortOrder() == null ? 0 : req.getSortOrder());
        e.setDescription(req.getDescription());
    }

    @Transactional
    public void delete(String id) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("模型不存在");
        repo.deleteById(id);
        planRepo.deleteByModelId(id);
    }

    @Transactional(readOnly = true)
    public List<AiModelDTO> list(String type) {
        List<AiModelEntity> all = (type == null || type.isBlank())
            ? repo.findAll()
            : repo.findByModelTypeAndActiveTrue(type);
        return all.stream().sorted((a, b) -> Integer.compare(
            a.getSortOrder(), b.getSortOrder())).map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AiModelDTO get(String id) {
        return toDto(repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在")));
    }

    /** 全量覆盖模型可用套餐。 */
    @Transactional
    public void setPlans(String id, List<String> planCodes) {
        if (!repo.existsById(id)) throw new IllegalArgumentException("模型不存在");
        planRepo.deleteByModelId(id);
        if (planCodes != null) {
            for (String code : planCodes) {
                AiModelPlanAccessEntity a = new AiModelPlanAccessEntity();
                a.setModelId(id); a.setPlanCode(code);
                planRepo.save(a);
            }
        }
    }

    /** 设为该 type 平台默认（先清同 type 其他 default）。 */
    @Transactional
    public void setDefault(String id) {
        AiModelEntity target = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        repo.findFirstByModelTypeAndIsDefaultTrueAndIsActiveTrue(target.getModelType())
            .ifPresent(old -> { old.setIsDefault(false); repo.save(old); });
        target.setIsDefault(true);
        repo.save(target);
    }

    @Transactional(readOnly = true)
    public List<String> plansOf(String id) {
        return planRepo.findByModelId(id).stream().map(AiModelPlanAccessEntity::getPlanCode).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AiModelEntity getEntity(String id) {
        return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在"));
    }

    public AiModelDTO toDto(AiModelEntity e) {
        AiModelDTO d = new AiModelDTO();
        d.setId(e.getId()); d.setCode(e.getCode()); d.setDisplayName(e.getDisplayName());
        d.setModelType(e.getModelType()); d.setProvider(e.getProvider()); d.setProtocol(e.getProtocol());
        d.setModelName(e.getModelName()); d.setBaseUrl(e.getBaseUrl());
        d.setApiKeyMasked(maskKey(keyCodec.decrypt(e.getApiKeyEnc())));
        d.setMaxTokens(e.getMaxTokens()); d.setTemperature(e.getTemperature());
        d.setInputPricePer1kMicros(e.getInputPricePer1kMicros());
        d.setOutputPricePer1kMicros(e.getOutputPricePer1kMicros());
        d.setPriceMultiplier(e.getPriceMultiplier()); d.setActive(e.getActive());
        d.setIsDefault(e.getIsDefault()); d.setSortOrder(e.getSortOrder());
        d.setDescription(e.getDescription());
        d.setPlanCodes(plansOf(e.getId()));
        return d;
    }

    private String maskKey(String plain) {
        if (plain == null || plain.length() <= 8) return "****";
        return plain.substring(0, 3) + "****" + plain.substring(plain.length() - 4);
    }
}
```

- [ ] **Step 5: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am test -Dtest=AiModelServiceTest
```
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/AiModelService.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/dto/AiModelDTO.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/dto/AiModelUpsertReq.java \
        novel-studio/studio-modules/studio-module-content/src/test/java/cn/novelstudio/module/content/service/AiModelServiceTest.java
git commit -m "feat(model): AiModelService(CRUD+套餐+默认+加密掩码)"
```

---

## Task 7: CrmModelController（管理员端点）

**Files:**
- Create: `.../controller/crm/CrmModelController.java`

- [ ] **Step 1: 写控制器**

```java
package cn.novelstudio.module.content.controller.crm;

import cn.novelstudio.kernel.result.Result;
import cn.novelstudio.module.content.dto.AiModelDTO;
import cn.novelstudio.module.content.dto.AiModelUpsertReq;
import cn.novelstudio.module.content.service.AiModelService;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content/crm/model")
@RequiredArgsConstructor
public class CrmModelController extends BaseController {

    private final AiModelService aiModelService;

    @PostMapping
    public Result<AiModelDTO> create(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @Valid @RequestBody AiModelUpsertReq req) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(aiModelService.create(req));
    }

    @PutMapping("/{id}")
    public Result<AiModelDTO> update(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id, @Valid @RequestBody AiModelUpsertReq req) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(aiModelService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id) {
        AuthRoleSupport.requireAdmin(roles);
        aiModelService.delete(id);
        return ok();
    }

    @GetMapping
    public Result<List<AiModelDTO>> list(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(required = false) String type) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(aiModelService.list(type));
    }

    @GetMapping("/{id}")
    public Result<AiModelDTO> get(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(aiModelService.get(id));
    }

    @PutMapping("/{id}/plans")
    public Result<Void> setPlans(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id, @RequestBody Map<String, List<String>> body) {
        AuthRoleSupport.requireAdmin(roles);
        aiModelService.setPlans(id, body.get("planCodes"));
        return ok();
    }

    @PostMapping("/{id}/default")
    public Result<Void> setDefault(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id) {
        AuthRoleSupport.requireAdmin(roles);
        aiModelService.setDefault(id);
        return ok();
    }

    @PostMapping("/{id}/test")
    public Result<Map<String, Object>> test(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id) {
        AuthRoleSupport.requireAdmin(roles);
        return ok(aiModelService.testConnectivity(id)); // 见下
    }
}
```

- [ ] **Step 2: AiModelService 加 testConnectivity**

在 `AiModelService` 加（调 python `/internal/model/test`，PythonParseClient 模式——新建 `ModelPythonClient`）：
```java
    private final ModelPythonClient pythonClient; // 新建，注入

    public Map<String, Object> testConnectivity(String id) {
        AiModelEntity e = repo.findById(id).orElseThrow();
        Map<String, Object> config = buildModelConfig(e, "public");
        return pythonClient.testModel(config);
    }

    private Map<String, Object> buildModelConfig(AiModelEntity e, String source) {
        Map<String, Object> c = new java.util.LinkedHashMap<>();
        c.put("model_type", e.getModelType()); c.put("provider", e.getProvider());
        c.put("protocol", e.getProtocol()); c.put("model_name", e.getModelName());
        c.put("base_url", e.getBaseUrl()); c.put("api_key", keyCodec.decrypt(e.getApiKeyEnc()));
        c.put("max_tokens", e.getMaxTokens()); c.put("temperature", e.getTemperature());
        c.put("pricing", buildPricing(e)); c.put("byok", false); c.put("source", source);
        c.put("code", e.getCode());
        return c;
    }

    private Map<String, Object> buildPricing(AiModelEntity e) {
        Map<String, Object> p = new java.util.LinkedHashMap<>();
        p.put("input_per_1k_micros", e.getInputPricePer1kMicros());
        p.put("output_per_1k_micros", e.getOutputPricePer1kMicros());
        p.put("multiplier", e.getPriceMultiplier());
        return p;
    }
```
（`ModelPythonClient` 在 Part2 与 `PythonParseClient` 同模式新建，注入 `RestClient pythonRestClient` + `ContentRuntimeProperties`。若 Part2 未到，本步先留 `pythonClient` 字段 + 空实现返回 `{ok:false,error:"not wired"}`，Part2 接通。）

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/crm/CrmModelController.java \
        novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/service/AiModelService.java
git commit -m "feat(model): CrmModelController 管理员端点 + testConnectivity"
```

---

## Task 8: ModelBootstrap（env→DB 引导）

**Files:**
- Create: `.../ModelBootstrap.java`

> 首次部署：ai_model 表空时，从 env 读默认模型（LLM/crawl/embedding/image 各一）写入 is_default=true。后续 admin 改 DB 生效，env 不再被运行期读。

- [ ] **Step 1: 写 ModelBootstrap**

```java
package cn.novelstudio.module.content;

import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ModelBootstrap {

    private final AiModelRepository repo;
    private final ModelKeyCodec keyCodec;

    @Bean
    ApplicationRunner bootstrapModels(Environment env) {
        return args -> {
            if (repo.count() > 0) return; // 已有数据，不引导
            log.info("ai_model 表为空，从 env 引导默认模型");
            // LLM 默认（openai_* env）
            seed(env, "llm", "platform-llm", "平台默认 LLM", "openai",
                env.getProperty("LLM_PROTOCOL", "openai"),
                env.getProperty("OPENAI_MODEL", "deepseek-chat"),
                env.getProperty("OPENAI_BASE_URL", ""),
                env.getProperty("OPENAI_API_KEY", ""));
            // crawl 默认
            seed(env, "crawl", "platform-crawl", "平台默认爬虫模型", "openai", "openai",
                env.getProperty("CRAWL_LLM_MODEL", "agnes-2.0-flash"),
                env.getProperty("CRAWL_LLM_BASE_URL", ""),
                env.getProperty("CRAWL_LLM_API_KEY", ""));
            // embedding 默认
            seed(env, "embedding", "platform-embed", "平台默认 Embedding", "openai", "openai",
                env.getProperty("RAG_EMBED_MODEL", "text-embedding-3-small"),
                env.getProperty("RAG_EMBED_BASE_URL", ""),
                env.getProperty("RAG_EMBED_API_KEY", ""));
            // image 默认
            seed(env, "image", "platform-image", "平台默认图像模型", "agnes", "openai",
                env.getProperty("AGNES_IMAGE_MODEL", "agnes-image-2.0-flash"),
                env.getProperty("AGNES_IMAGE_BASE_URL", ""),
                env.getProperty("AGNES_IMAGE_API_KEY", ""));
        };
    }

    private void seed(Environment env, String type, String code, String name, String provider,
                      String protocol, String model, String baseUrl, String apiKey) {
        AiModelEntity e = new AiModelEntity();
        e.setCode(code); e.setDisplayName(name); e.setModelType(type);
        e.setProvider(provider); e.setProtocol(protocol); e.setModelName(model);
        e.setBaseUrl(baseUrl); e.setApiKeyEnc(keyCodec.encrypt(apiKey));
        e.setPriceMultiplier(java.math.BigDecimal.ONE); e.setActive(true); e.setIsDefault(true);
        repo.save(e);
        log.info("引导默认模型 type={} code={}", type, code);
    }
}
```

- [ ] **Step 2: 启动验证**

`_restart-dev-stack.ps1`（先设 `MODEL_KEY_ENCRYPTION_KEY` env，base64 32 字节，可用 `AesGcmCodec.randomKeyBase64()` 生成）。查日志 "引导默认模型"，连 PG 确认 ai_model 有 4 条 is_default=true。

- [ ] **Step 3: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/ModelBootstrap.java
git commit -m "feat(model): ModelBootstrap env→DB 引导默认模型"
```

---

Part 1 完成。→ 继续 [Part 2 — Java 配额+透传+用户端点+计费](./2026-06-19-model-config-part2-java-quota.md)
