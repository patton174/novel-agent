# Part 2 — Java 配额旁路 + context 透传 + 用户端点 + 计费

> 主索引：[2026-06-19-model-config.md](./2026-06-19-model-config.md) ｜ [Part 1b](./2026-06-19-model-config-part1b-java-model.md)
> 设计：[册2 §3/§4](../specs/2026-06-19-model-config-design-part2.md)
> 约定：Java 21；`JAVA_HOME=/d/Programs/Java/jdk_21`。先写失败测试。

---

## Task 9: AuthModelBiz（可用列表+默认+BYOK+gating）

**Files:**
- Create: `.../service/auth/biz/AuthModelBiz.java`
- Create: `.../dto/UserModelDTO.java`、`.../dto/AvailableModelsDTO.java`、`.../dto/ByokUpsertReq.java`

> 需要 `FeatureGateBiz`（billing 模块）取用户 plan code + 校验模型-套餐关联。`AiModelPlanAccessRepository.findByPlanCode(planCode)` 取该套餐可用模型 id 集。

- [ ] **Step 1: 写 DTO**

```java
package cn.novelstudio.module.content.dto;

import lombok.Data;

@Data
public class UserModelDTO {
    private String id;
    private String modelType;
    private String publicModelId;   // 引用公共模型时
    private AiModelDTO publicModel; // 展开公共模型信息
    private String label;           // BYOK 自命名
    private String provider;        // BYOK
    private String protocol;
    private String modelName;
    private String baseUrl;
    private Boolean byok;
    private Boolean isDefault;
}
```

```java
package cn.novelstudio.module.content.dto;

import lombok.Data;
import java.util.List;

@Data
public class AvailableModelsDTO {
    private List<AiModelDTO> publicModels;   // 当前套餐可用
    private List<UserModelDTO> byok;         // 自己的 BYOK
}
```

```java
package cn.novelstudio.module.content.dto;

import lombok.Data;

@Data
public class ByokUpsertReq {
    private String label;
    private String modelType;      // 默认 llm
    private String provider;
    private String protocol;
    private String modelName;
    private String baseUrl;
    private String apiKey;         // 明文
}
```

- [ ] **Step 2: 写 AuthModelBiz**

```java
package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.kernel.result.Result;
import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
import cn.novelstudio.module.content.dto.*;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.entity.AiModelPlanAccessEntity;
import cn.novelstudio.module.content.entity.UserModelEntity;
import cn.novelstudio.module.content.repository.AiModelPlanAccessRepository;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.repository.UserModelRepository;
import cn.novelstudio.module.content.service.AiModelService;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AuthModelBiz extends BaseBiz {

    private final AiModelRepository aiModelRepo;
    private final AiModelPlanAccessRepository planAccessRepo;
    private final UserModelRepository userModelRepo;
    private final ModelKeyCodec keyCodec;
    private final FeatureGateBiz featureGateBiz; // 取用户 plan code

    @Transactional(readOnly = true)
    public Result<AvailableModelsDTO> available(Long userId, String type) {
        String t = type == null ? "llm" : type;
        String planCode = featureGateBiz.resolvePlanCode(userId); // 新增方法见下
        List<String> allowedModelIds = planAccessRepo.findByPlanCode(planCode).stream()
            .map(AiModelPlanAccessEntity::getModelId).collect(Collectors.toList());
        List<AiModelDTO> publicModels = aiModelRepo.findAllById(allowedModelIds).stream()
            .filter(e -> t.equals(e.getModelType()) && Boolean.TRUE.equals(e.getActive()))
            .map(aiModelService()::toDto).collect(Collectors.toList());
        List<UserModelDTO> byok = userModelRepo.findByUserIdAndModelType(userId, t).stream()
            .filter(e -> Boolean.TRUE.equals(e.getByok()))
            .map(this::toUserDto).collect(Collectors.toList());
        AvailableModelsDTO dto = new AvailableModelsDTO();
        dto.setPublicModels(publicModels); dto.setByok(byok);
        return ok(dto);
    }

    @Transactional(readOnly = true)
    public Result<UserModelDTO> defaultModel(Long userId, String type) {
        String t = type == null ? "llm" : type;
        return ok(userModelRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, t)
            .map(this::toUserDto).orElse(null));
    }

    @Transactional
    public Result<Void> setDefault(Long userId, String type, String userModelId) {
        String t = type == null ? "llm" : type;
        userModelRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, t).ifPresent(old -> {
            old.setIsDefault(false); userModelRepo.save(old);
        });
        UserModelEntity e = userModelRepo.findById(userModelId)
            .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        if (!e.getUserId().equals(userId)) throw new IllegalArgumentException("无权操作");
        e.setIsDefault(true); userModelRepo.save(e);
        return ok();
    }

    @Transactional
    public Result<UserModelDTO> createByok(Long userId, ByokUpsertReq req) {
        UserModelEntity e = new UserModelEntity();
        e.setUserId(userId); e.setModelType(req.getModelType() == null ? "llm" : req.getModelType());
        e.setByok(true); e.setLabel(req.getLabel()); e.setProvider(req.getProvider());
        e.setProtocol(req.getProtocol()); e.setModelName(req.getModelName());
        e.setBaseUrl(req.getBaseUrl()); e.setApiKeyEnc(keyCodec.encrypt(req.getApiKey()));
        return ok(toUserDto(userModelRepo.save(e)));
    }

    @Transactional
    public Result<UserModelDTO> updateByok(Long userId, String id, ByokUpsertReq req) {
        UserModelEntity e = userModelRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        if (!e.getUserId().equals(userId)) throw new IllegalArgumentException("无权操作");
        e.setLabel(req.getLabel()); e.setProvider(req.getProvider());
        e.setProtocol(req.getProtocol()); e.setModelName(req.getModelName());
        e.setBaseUrl(req.getBaseUrl());
        if (req.getApiKey() != null && !req.getApiKey().isEmpty()) {
            e.setApiKeyEnc(keyCodec.encrypt(req.getApiKey()));
        }
        return ok(toUserDto(userModelRepo.save(e)));
    }

    @Transactional
    public Result<Void> deleteByok(Long userId, String id) {
        UserModelEntity e = userModelRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        if (!e.getUserId().equals(userId)) throw new IllegalArgumentException("无权操作");
        userModelRepo.delete(e);
        return ok();
    }

    private UserModelDTO toUserDto(UserModelEntity e) {
        UserModelDTO d = new UserModelDTO();
        d.setId(e.getId()); d.setModelType(e.getModelType());
        d.setPublicModelId(e.getPublicModelId()); d.setLabel(e.getLabel());
        d.setProvider(e.getProvider()); d.setProtocol(e.getProtocol());
        d.setModelName(e.getModelName()); d.setBaseUrl(e.getBaseUrl());
        d.setByok(e.getByok()); d.setIsDefault(e.getIsDefault());
        if (e.getPublicModelId() != null) {
            aiModelRepo.findById(e.getPublicModelId()).ifPresent(m -> d.setPublicModel(aiModelService().toDto(m)));
        }
        return d;
    }

    private AiModelService aiModelService() {
        // 注入 AiModelService 会循环（AiModelService 不依赖 AuthModelBiz，可直接注入为字段）
        return aiModelServiceField;
    }

    private final AiModelService aiModelServiceField;
}
```
（`FeatureGateBiz.resolvePlanCode(userId)` 新增——返回用户当前套餐 code。`FeatureGateBiz` 现有 `subscriptionBiz.resolvePlanForUser` 返回 `ProductPlanEntity`，加方法 `resolvePlanCode(userId)` = `resolvePlanForUser(userId).getCode()`。把 `aiModelServiceField` 改为构造注入 final 字段 `aiModelService`，删除 `aiModelService()` 间接调用，直接用字段。）

- [ ] **Step 3: FeatureGateBiz 加 resolvePlanCode**

在 `FeatureGateBiz` 加：
```java
    public String resolvePlanCode(long userId) {
        return subscriptionBiz.resolvePlanForUser(userId).getCode();
    }
```

- [ ] **Step 4: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-content -am compile
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/ \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/FeatureGateBiz.java
git commit -m "feat(model): AuthModelBiz 可用列表+默认+BYOK+gating"
```

---

## Task 10: AuthModelController（用户端点）

**Files:**
- Create: `.../controller/auth/AuthModelController.java`

- [ ] **Step 1: 写控制器**

```java
package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.result.Result;
import cn.novelstudio.module.content.dto.AvailableModelsDTO;
import cn.novelstudio.module.content.dto.ByokUpsertReq;
import cn.novelstudio.module.content.dto.UserModelDTO;
import cn.novelstudio.module.content.service.auth.biz.AuthModelBiz;
import cn.novelstudio.platform.web.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/content/auth/model")
@RequiredArgsConstructor
public class AuthModelController extends BaseController {

    private final AuthModelBiz biz;

    @GetMapping("/available")
    public Result<AvailableModelsDTO> available(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(required = false) String type) {
        return biz.available(parseUserId(userId), type);
    }

    @GetMapping("/default")
    public Result<UserModelDTO> defaultModel(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(required = false) String type) {
        return biz.defaultModel(parseUserId(userId), type);
    }

    @PutMapping("/default")
    public Result<Void> setDefault(
        @RequestHeader("X-User-Id") String userId,
        @RequestBody Map<String, String> body) {
        return biz.setDefault(parseUserId(userId), body.get("type"), body.get("userModelId"));
    }

    @PostMapping("/byok")
    public Result<UserModelDTO> createByok(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody ByokUpsertReq req) {
        return biz.createByok(parseUserId(userId), req);
    }

    @PutMapping("/byok/{id}")
    public Result<UserModelDTO> updateByok(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String id, @Valid @RequestBody ByokUpsertReq req) {
        return biz.updateByok(parseUserId(userId), id, req);
    }

    @DeleteMapping("/byok/{id}")
    public Result<Void> deleteByok(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String id) {
        return biz.deleteByok(parseUserId(userId), id);
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
git add novel-studio/studio-modules/studio-module-content/src/main/java/cn/novelstudio/module/content/controller/auth/AuthModelController.java
git commit -m "feat(model): AuthModelController 用户端点"
```

---

## Task 11: AgentRunContextDto + AgentRunState + AgentContextAssembler 加 model_config

**Files:**
- Modify: `studio-module-agent/.../dto/agent/AgentRunContextDto.java`
- Modify: `studio-module-agent/.../orchestration/AgentRunState.java`
- Modify: `studio-module-agent/.../service/AgentContextAssembler.java`

> 4 层镜像之一：record 加字段 + toContextDto 映射 + assembler 写 Map。`AgentRunContextDto` 是 `@JsonNaming(SnakeCase)` record，加 `Map<String,Object> modelConfig` → 序列化为 `model_config`。

- [ ] **Step 1: AgentRunContextDto 加字段**

在 record 末尾（`selectedChoice` 后）加：
```java
    Map<String, Object> modelConfig
```
（完整 record 签名加该参数。注意所有构造调用点——`AgentRunState.toContextDto()` 是唯一构造点，需同步加实参。）

- [ ] **Step 2: AgentContextAssembler 写 model_config 入 Map**

在 `AgentContextAssembler.buildContext`（`AgentContextAssembler.java:63`）内，context Map 构建后加：
```java
    // model_config 由 AgentModelResolver 预先放入 request 的扩展位；
    // assembler 通过 request 取（AgentStreamRequest 加 modelConfig 字段，或从 AgentBridgeService 传入）
    // 简化：assembler 不直接解析模型，由 AgentBridgeService 在 state 构造后注入。
```
**更清晰方案**：不在 assembler 解析（assembler 无 userId 模型上下文），而在 `AgentBridgeService` 组装 state 后，把 model_config 注入 `assembledContext` Map（key `"model_config"`），`AgentRunState.toContextDto` 从 Map 取。见 Task 13。

本任务只做：assembler Map 不动；`toContextDto` 从 `assembledContext.get("model_config")` 取并塞 record。

- [ ] **Step 3: AgentRunState.toContextDto 映射 model_config**

在 `AgentRunState.toContextDto()`（`AgentRunState.java:80-132`）的 record 构造里加末尾实参：
```java
        @SuppressWarnings("unchecked")
        Map<String, Object> modelConfig = (Map<String, Object>) assembledContext.get("model_config");
```
并把它作为 record 最后一个参数传入。（`memory_tree_index` 已有从 assembledContext 取 contextPatch 的先例，line 106-110。）

- [ ] **Step 4: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-agent -am compile
```

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/dto/agent/AgentRunContextDto.java \
        novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/orchestration/AgentRunState.java
git commit -m "feat(model): AgentRunContextDto 加 model_config + toContextDto 映射"
```

---

## Task 12: AgentModelResolver（解析用户模型）

**Files:**
- Create: `studio-module-agent/.../service/AgentModelResolver.java`
- Test: `studio-module-agent/.../service/AgentModelResolverTest.java`

> 解析优先级：临时覆盖(run request.modelOverride) > 用户默认(user_model.is_default) > 平台默认(ai_model.is_default)。返回 model_config Map（含解密 api_key + pricing + byok + source）。BYOK 校验 own；公共模型校验套餐可用性。

- [ ] **Step 1: 写失败测试**

```java
package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.entity.UserModelEntity;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.repository.UserModelRepository;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentModelResolverTest {

    @Mock AiModelRepository aiRepo;
    @Mock UserModelRepository userRepo;
    @Mock ModelKeyCodec keyCodec;
    @InjectMocks AgentModelResolver resolver;

    @Test
    void resolve_publicUserDefault_returnsPublicConfig() {
        UserModelEntity um = new UserModelEntity();
        um.setId("um1"); um.setUserId(10L); um.setPublicModelId("m1"); um.setByok(false);
        when(userRepo.findByUserIdAndModelTypeAndIsDefaultTrue(10L, "llm")).thenReturn(Optional.of(um));
        AiModelEntity m = new AiModelEntity();
        m.setId("m1"); m.setModelType("llm"); m.setProvider("openai"); m.setProtocol("openai");
        m.setModelName("gpt-4o"); m.setBaseUrl("https://x"); m.setApiKeyEnc("ENC");
        m.setPriceMultiplier(BigDecimal.ONE); m.setInputPricePer1kMicros(2500L);
        when(aiRepo.findById("m1")).thenReturn(Optional.of(m));
        when(keyCodec.decrypt("ENC")).thenReturn("sk-plain");

        Map<String, Object> cfg = resolver.resolve(10L, null);
        assertThat(cfg.get("source")).isEqualTo("public");
        assertThat(cfg.get("api_key")).isEqualTo("sk-plain");
        assertThat(cfg.get("byok")).isEqualTo(false);
    }

    @Test
    void resolve_byokUserDefault_returnsByokConfig_noPricing() {
        UserModelEntity um = new UserModelEntity();
        um.setId("um2"); um.setUserId(10L); um.setByok(true);
        um.setProvider("openai"); um.setProtocol("openai"); um.setModelName("my");
        um.setBaseUrl("https://y"); um.setApiKeyEnc("ENC2");
        when(userRepo.findByUserIdAndModelTypeAndIsDefaultTrue(10L, "llm")).thenReturn(Optional.of(um));
        when(keyCodec.decrypt("ENC2")).thenReturn("sk-mine");

        Map<String, Object> cfg = resolver.resolve(10L, null);
        assertThat(cfg.get("source")).isEqualTo("byok");
        assertThat(cfg.get("byok")).isEqualTo(true);
        assertThat(cfg.get("api_key")).isEqualTo("sk-mine");
        assertThat(cfg.get("pricing")).isNull();
    }

    @Test
    void resolve_noUserDefault_fallsBackPlatformDefault() {
        when(userRepo.findByUserIdAndModelTypeAndIsDefaultTrue(10L, "llm")).thenReturn(Optional.empty());
        AiModelEntity m = new AiModelEntity();
        m.setId("pd"); m.setModelType("llm"); m.setProvider("openai"); m.setProtocol("openai");
        m.setModelName("def"); m.setBaseUrl("https://d"); m.setApiKeyEnc("ENC");
        m.setPriceMultiplier(BigDecimal.ONE);
        when(aiRepo.findFirstByModelTypeAndIsDefaultTrueAndIsActiveTrue("llm")).thenReturn(Optional.of(m));
        when(keyCodec.decrypt("ENC")).thenReturn("sk-def");

        Map<String, Object> cfg = resolver.resolve(10L, null);
        assertThat(cfg.get("source")).isEqualTo("platform_default");
    }
}
```

- [ ] **Step 2: 跑测试验证失败**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-agent -am test -Dtest=AgentModelResolverTest
```

- [ ] **Step 3: 写 AgentModelResolver**

```java
package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.entity.UserModelEntity;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.repository.UserModelRepository;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class AgentModelResolver {

    private final UserModelRepository userRepo;
    private final AiModelRepository aiRepo;
    private final ModelKeyCodec keyCodec;

    /** 解析用户模型。overrideUserModelId 非空=临时覆盖。返回 model_config Map。 */
    public Map<String, Object> resolve(Long userId, String overrideUserModelId) {
        // 1. 临时覆盖
        if (overrideUserModelId != null && !overrideUserModelId.isBlank()) {
            UserModelEntity um = userRepo.findById(overrideUserModelId)
                .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
            if (!um.getUserId().equals(userId)) throw new IllegalArgumentException("无权使用该模型");
            return fromUserModel(um);
        }
        // 2. 用户默认
        var def = userRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, "llm");
        if (def.isPresent()) return fromUserModel(def.get());
        // 3. 平台默认
        AiModelEntity pd = aiRepo.findFirstByModelTypeAndIsDefaultTrueAndIsActiveTrue("llm")
            .orElseThrow(() -> new IllegalStateException("无可用平台默认 LLM 模型"));
        return fromAiModel(pd, "platform_default");
    }

    private Map<String, Object> fromUserModel(UserModelEntity um) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("model_type", um.getModelType() == null ? "llm" : um.getModelType());
        if (Boolean.TRUE.equals(um.getByok())) {
            c.put("provider", um.getProvider()); c.put("protocol", um.getProtocol());
            c.put("model_name", um.getModelName()); c.put("base_url", um.getBaseUrl());
            c.put("api_key", keyCodec.decrypt(um.getApiKeyEnc()));
            c.put("byok", true); c.put("source", "byok"); c.put("pricing", null);
            c.put("code", "byok:" + um.getId());
            return c;
        }
        // 公共模型引用
        AiModelEntity m = aiRepo.findById(um.getPublicModelId())
            .orElseThrow(() -> new IllegalStateException("引用的公共模型不存在"));
        return fromAiModel(m, "public");
    }

    private Map<String, Object> fromAiModel(AiModelEntity e, String source) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("model_type", e.getModelType()); c.put("provider", e.getProvider());
        c.put("protocol", e.getProtocol()); c.put("model_name", e.getModelName());
        c.put("base_url", e.getBaseUrl()); c.put("api_key", keyCodec.decrypt(e.getApiKeyEnc()));
        c.put("max_tokens", e.getMaxTokens()); c.put("temperature", e.getTemperature());
        c.put("byok", false); c.put("source", source); c.put("code", e.getCode());
        Map<String, Object> pricing = new LinkedHashMap<>();
        pricing.put("input_per_1k_micros", e.getInputPricePer1kMicros());
        pricing.put("output_per_1k_micros", e.getOutputPricePer1kMicros());
        pricing.put("multiplier", e.getPriceMultiplier());
        c.put("pricing", pricing);
        return c;
    }

    public boolean isByok(Map<String, Object> modelConfig) {
        return modelConfig != null && Boolean.TRUE.equals(modelConfig.get("byok"));
    }
}
```
（套餐 gating 公共模型可用性：`resolve` 对 public 源暂不重复校验套餐——用户能选为默认/临时说明前端已 gating 过；后端兜底校验放 `AgentBridgeService` 调 resolver 前，可选。本计划后端不重复校验，依赖前端 gating + 可用列表已过滤。）

- [ ] **Step 4: 跑测试验证通过**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-agent -am test -Dtest=AgentModelResolverTest
```
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/service/AgentModelResolver.java \
        novel-studio/studio-modules/studio-module-agent/src/test/java/cn/novelstudio/module/agent/service/AgentModelResolverTest.java
git commit -m "feat(model): AgentModelResolver 解析用户模型(覆盖>默认>平台默认)"
```

---

## Task 13: AgentBridgeService byok 旁路配额 + 注入 model_config

**Files:**
- Modify: `studio-module-agent/.../service/AgentBridgeService.java`

- [ ] **Step 1: 注入 AgentModelResolver + model_config 注入 + byok 旁路**

在 `AgentBridgeService` 构造器加 `AgentModelResolver modelResolver` 字段。
在 `stream(...)` 方法内，state 构造后（`AgentBridgeState.java:141` 附近 `state = new AgentRunState(...)` 之前/之后）注入 model_config：
```java
                Map<String, Object> context = contextFuture.join();
                // 解析模型（临时覆盖从 request 取，需 AgentStreamRequest 加 modelOverride 字段）
                Map<String, Object> modelConfig = modelResolver.resolve(userId, request.getModelOverride());
                context.put("model_config", modelConfig);
                boolean byok = modelResolver.isByok(modelConfig);
                state = new AgentRunState(userId, finalSessionId, runId, messageId, request, context);
```
配额旁路——把 line 133-135 的 quota 调用改为条件：
```java
                CompletableFuture<QuotaGateResult> quotaFuture = CompletableFuture.supplyAsync(() -> {
                    if (byok) return null; // BYOK 跳过配额（但 modelConfig 需在 quota 前算）
                    return quotaGateService.assertCanStartRun(userId);
                });
```
**问题**：modelConfig 在 contextFuture 之后才算，但 quotaFuture 与 contextFuture 并行。**调整顺序**：先单独算 modelConfig（不并行，快——纯 DB 查），再并行 quota(条件) + context：
```java
                Map<String, Object> modelConfig = modelResolver.resolve(userId, request.getModelOverride());
                boolean byok = modelResolver.isByok(modelConfig);

                CompletableFuture<QuotaGateResult> quotaFuture = CompletableFuture.supplyAsync(() -> {
                    if (byok) return null;
                    return quotaGateService.assertCanStartRun(userId);
                });
                CompletableFuture<Map<String, Object>> contextFuture = CompletableFuture.supplyAsync(
                    () -> contextAssembler.assemble(userId, finalSessionId, request)
                );
                CompletableFuture.allOf(quotaFuture, contextFuture).join();
                Map<String, Object> context = contextFuture.join();
                context.put("model_config", modelConfig);
                state = new AgentRunState(userId, finalSessionId, runId, messageId, request, context);
```
（`AgentStreamRequest` 加 `String modelOverride` 字段——前端临时切换时传 user_model_id；默认 null。）

- [ ] **Step 2: AgentStreamRequest 加 modelOverride**

在 `AgentStreamRequest`（DTO）加 `private String modelOverride;`（getter/setter 或 record 字段，按其定义）。

- [ ] **Step 3: 编译验证**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-agent -am compile
```

- [ ] **Step 4: 提交**

```bash
git add novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/service/AgentBridgeService.java \
        novel-studio/studio-modules/studio-module-agent/src/main/java/cn/novelstudio/module/agent/dto/agent/AgentStreamRequest.java
git commit -m "feat(model): AgentBridgeService 解析模型注入 context + BYOK 旁路配额"
```

---

## Task 14: UsageReportRequest/Entity/Biz 加 byok/model_code/unit_cost

**Files:**
- Modify: `studio-module-billing/.../dto/UsageReportRequest.java`
- Modify: `studio-module-billing/.../entity/UsageEventEntity.java`
- Modify: `studio-module-billing/.../service/biz/UsageReportBiz.java`

- [ ] **Step 1: UsageReportRequest 加字段**

record 加：
```java
    Long unitCostMicros,
    Boolean byok,
    String modelCode
```
（放 `totalCostMicros` 后。）

- [ ] **Step 2: UsageEventEntity 加字段**

加：
```java
    @Column(name = "byok", nullable = false)
    private Boolean byok = false;

    @Column(name = "model_code", length = 64)
    private String modelCode;
```

- [ ] **Step 3: UsageReportBiz.persistReport 持久化新字段**

在 `persistReport`（`UsageReportBiz.java:48` 附近）cost 计算后加：
```java
        long unitCost = request.unitCostMicros() != null ? request.unitCostMicros() : 0L;
```
并在 event 构建后加：
```java
        event.setUnitCostMicros(unitCost);
        event.setByok(request.byok() != null && request.byok());
        event.setModelCode(trimToNull(request.modelCode()));
```
（`setUnitCostMicros` 现有列默认 0L；BYOK 时 cost=0 + byok=true 不进配额汇总——`upsertPeriodSummary`/`incrementRedis` 对 byok 跳过：）
```java
        if (!event.getByok()) {
            upsertPeriodSummary(request.userId(), period, tokenDelta, cost, false);
            incrementRedis(request.userId(), period, tokenDelta, 0);
        }
```
（BYOK 仍存 usage_event 供统计，但不累加配额/Redis。）

- [ ] **Step 4: 编译 + 启动 validate**

```bash
cd novel-studio && JAVA_HOME=/d/Programs/Java/jdk_21 PATH=/d/Programs/Java/jdk_21/bin:$PATH \
  mvn -q -o -pl studio-modules/studio-module-billing -am compile
```
`_restart-dev-stack.ps1` 确认 validate 通过（V10 已加列）。

- [ ] **Step 5: 提交**

```bash
git add novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/dto/UsageReportRequest.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/entity/UsageEventEntity.java \
        novel-studio/studio-modules/studio-module-billing/src/main/java/cn/novelstudio/module/billing/service/biz/UsageReportBiz.java
git commit -m "feat(model): usage_event 加 byok/model_code/unit_cost；BYOK 不累加配额"
```

---

Part 2 完成。→ 继续 [Part 3 — python ModelRegistry+路由](./2026-06-19-model-config-part3-python-registry.md)
