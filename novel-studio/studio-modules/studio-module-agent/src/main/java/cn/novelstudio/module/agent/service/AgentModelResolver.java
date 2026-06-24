package cn.novelstudio.module.agent.service;

import cn.novelstudio.module.content.entity.AiModelCredentialEntity;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.repository.AiModelCredentialRepository;
import cn.novelstudio.module.content.entity.UserModelCredentialEntity;
import cn.novelstudio.module.content.entity.UserModelEntity;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.repository.UserModelCredentialRepository;
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
    private final UserModelCredentialRepository credentialRepo;
    private final AiModelRepository aiRepo;
    private final AiModelCredentialRepository aiCredentialRepo;
    private final ModelKeyCodec keyCodec;

    /** 解析用户模型。override 非空=临时覆盖（userModelId 或 pub:aiModelId）。 */
    public Map<String, Object> resolve(Long userId, String override) {
        if (override != null && !override.isBlank()) {
            if (override.startsWith("pub:")) {
                String publicModelId = override.substring(4);
                AiModelEntity m = aiRepo.findById(publicModelId)
                    .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
                return fromAiModel(m, "public");
            }
            UserModelEntity um = userRepo.findById(override)
                .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
            if (!um.getUserId().equals(userId)) {
                throw new IllegalArgumentException("无权使用该模型");
            }
            return fromUserModel(um);
        }
        var def = userRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, "llm");
        if (def.isPresent()) {
            return fromUserModel(def.get());
        }
        AiModelEntity pd = aiRepo.findFirstByModelTypeAndIsDefaultTrueAndActiveTrue("llm")
            .orElseThrow(() -> new IllegalStateException("无可用平台默认 LLM 模型"));
        return fromAiModel(pd, "platform_default");
    }

    private Map<String, Object> fromUserModel(UserModelEntity um) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("model_type", um.getModelType() == null ? "llm" : um.getModelType());
        if (Boolean.TRUE.equals(um.getByok())) {
            String provider;
            String protocol;
            String baseUrl;
            String apiKey;
            if (um.getCredentialId() != null && !um.getCredentialId().isBlank()) {
                UserModelCredentialEntity cred = credentialRepo.findById(um.getCredentialId())
                    .orElseThrow(() -> new IllegalStateException("BYOK 连接不存在"));
                if (!cred.getUserId().equals(um.getUserId())) {
                    throw new IllegalStateException("BYOK 连接归属异常");
                }
                provider = cred.getProvider();
                protocol = cred.getProtocol();
                baseUrl = cred.getBaseUrl();
                apiKey = keyCodec.decrypt(cred.getApiKeyEnc());
            } else {
                provider = um.getProvider();
                protocol = um.getProtocol();
                baseUrl = um.getBaseUrl();
                apiKey = keyCodec.decrypt(um.getApiKeyEnc());
            }
            c.put("provider", provider);
            c.put("protocol", protocol);
            c.put("model_name", um.getModelName());
            c.put("model", um.getModelName());
            c.put("base_url", baseUrl);
            c.put("api_key", apiKey);
            c.put("byok", true);
            c.put("source", "byok");
            c.put("pricing", null);
            c.put("code", "byok:" + um.getId());
            return c;
        }
        AiModelEntity m = aiRepo.findById(um.getPublicModelId())
            .orElseThrow(() -> new IllegalStateException("引用的公共模型不存在"));
        return fromAiModel(m, "public");
    }

    private Map<String, Object> fromAiModel(AiModelEntity e, String source) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("model_type", e.getModelType());
        c.put("provider", e.getProvider());
        c.put("protocol", e.getProtocol());
        c.put("model_name", e.getModelName());
        c.put("model", e.getModelName());
        c.put("base_url", e.getBaseUrl());
        String apiKey;
        if (e.getCredentialId() != null && !e.getCredentialId().isBlank()) {
            AiModelCredentialEntity cred = aiCredentialRepo.findById(e.getCredentialId())
                .orElseThrow(() -> new IllegalStateException("平台模型连接不存在"));
            apiKey = keyCodec.decrypt(cred.getApiKeyEnc());
        } else {
            apiKey = keyCodec.decrypt(e.getApiKeyEnc());
        }
        c.put("api_key", apiKey);
        c.put("max_tokens", e.getMaxTokens());
        c.put("temperature", e.getTemperature());
        c.put("byok", false);
        c.put("source", source);
        c.put("code", e.getCode());
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
