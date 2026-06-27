package cn.novelstudio.module.agent.service;

import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
import cn.novelstudio.module.content.entity.AiModelCredentialEntity;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.entity.AiModelPlanAccessEntity;
import cn.novelstudio.module.content.entity.UserModelEntity;
import cn.novelstudio.module.content.repository.AiModelCredentialRepository;
import cn.novelstudio.module.content.repository.AiModelPlanAccessRepository;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.repository.UserModelRepository;
import cn.novelstudio.module.content.service.model.ModelPriceTier;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AgentModelResolver {

    private static final String AUTO_MARKER = "auto";
    private static final String TIER_PREFIX = "tier:";

    private final UserModelRepository userRepo;
    private final AiModelRepository aiRepo;
    private final AiModelCredentialRepository aiCredentialRepo;
    private final AiModelPlanAccessRepository planAccessRepo;
    private final FeatureGateBiz featureGateBiz;
    private final ModelKeyCodec keyCodec;

    /** 解析用户模型。override 非空=临时覆盖（auto / tier:light|balanced|extreme）。 */
    public Map<String, Object> resolve(Long userId, String override, String message) {
        if (override != null && !override.isBlank()) {
            return resolveExplicit(userId, override.trim(), message);
        }
        return resolveUserDefault(userId, message);
    }

    private Map<String, Object> resolveExplicit(Long userId, String override, String message) {
        if (AUTO_MARKER.equals(override)) {
            return resolveAuto(userId, message);
        }
        if (override.startsWith(TIER_PREFIX)) {
            ModelPriceTier.Tier tier = parseTierOverride(override);
            return resolveTier(userId, tier, message, "tier");
        }
        if (override.startsWith("pub:")) {
            String publicModelId = override.substring(4);
            AiModelEntity m = aiRepo.findById(publicModelId)
                .orElseThrow(() -> ValidationException.keyed("model.not_found"));
            assertAllowed(userId, m);
            ModelPriceTier.Tier tier = ModelPriceTier.tierOf(m.getPriceMultiplier());
            if (tier == null) {
                return fromAiModel(m, "public");
            }
            return resolveTier(userId, tier, message, "tier");
        }
        throw ValidationException.keyed("model.tier_auto_only");
    }

    private Map<String, Object> resolveUserDefault(Long userId, String message) {
        var def = userRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, "llm");
        if (def.isPresent()) {
            UserModelEntity um = def.get();
            if (Boolean.TRUE.equals(um.getByok())) {
                throw ValidationException.keyed("model.private_disabled");
            }
            if (AUTO_MARKER.equals(um.getModelName()) && um.getPublicModelId() == null) {
                return resolveAuto(userId, message);
            }
            ModelPriceTier.Tier tierPref = parseTierMarker(um.getModelName());
            if (tierPref != null) {
                return resolveTier(userId, tierPref, message, "default_tier");
            }
            if (um.getPublicModelId() != null) {
                AiModelEntity m = aiRepo.findById(um.getPublicModelId())
                    .orElseThrow(() -> ValidationException.keyed("model.public_ref_missing"));
                assertAllowed(userId, m);
                ModelPriceTier.Tier tier = ModelPriceTier.tierOf(m.getPriceMultiplier());
                if (tier != null) {
                    return resolveTier(userId, tier, message, "default_tier");
                }
                return fromAiModel(m, "public");
            }
        }
        AiModelEntity pd = aiRepo.findFirstByModelTypeAndIsDefaultTrueAndActiveTrue("llm")
            .orElseThrow(() -> ValidationException.keyed("model.no_default_llm"));
        ModelPriceTier.Tier tier = ModelPriceTier.tierOf(pd.getPriceMultiplier());
        if (tier != null) {
            return resolveTier(userId, tier, message, "platform_default");
        }
        return fromAiModel(pd, "platform_default");
    }

    private Map<String, Object> resolveAuto(Long userId, String message) {
        ModelPriceTier.Tier tier = ModelPriceTier.classifyComplexity(message);
        Map<String, Object> config = resolveTier(userId, tier, message, "auto");
        config.put("auto_tier", tier.name().toLowerCase());
        return config;
    }

    private Map<String, Object> resolveTier(
        Long userId,
        ModelPriceTier.Tier tier,
        String message,
        String source
    ) {
        List<AiModelEntity> allowed = allowedPublicModels(userId, "llm");
        AiModelEntity picked = pickBalancedModel(allowed, tier, userId, message);
        Map<String, Object> config = fromAiModel(picked, source);
        config.put("requested_tier", tier.name().toLowerCase());
        return config;
    }

    private AiModelEntity pickBalancedModel(
        List<AiModelEntity> allowed,
        ModelPriceTier.Tier tier,
        Long userId,
        String salt
    ) {
        List<AiModelEntity> candidates = allowed.stream()
            .filter(m -> ModelPriceTier.tierOf(m.getPriceMultiplier()) == tier)
            .sorted(Comparator.comparing(AiModelEntity::getSortOrder)
                .thenComparing(AiModelEntity::getDisplayName))
            .collect(Collectors.toList());
        if (!candidates.isEmpty()) {
            int idx = Math.floorMod(Objects.hash(userId, tier.name(), salt), candidates.size());
            return candidates.get(idx);
        }
        return allowed.stream()
            .min(Comparator.comparing(m -> tierDistance(tier, m.getPriceMultiplier())))
            .orElseGet(() -> aiRepo.findFirstByModelTypeAndIsDefaultTrueAndActiveTrue("llm")
                .orElseThrow(() -> ValidationException.keyed("model.no_llm_available")));
    }

    private List<AiModelEntity> allowedPublicModels(Long userId, String modelType) {
        String planCode = featureGateBiz.resolvePlanCode(userId);
        List<String> allowedIds = planAccessRepo.findByPlanCode(planCode).stream()
            .map(AiModelPlanAccessEntity::getModelId)
            .collect(Collectors.toList());
        return aiRepo.findAllById(allowedIds).stream()
            .filter(e -> modelType.equals(e.getModelType()) && Boolean.TRUE.equals(e.getActive()))
            .sorted(Comparator.comparing(AiModelEntity::getSortOrder))
            .collect(Collectors.toList());
    }

    private void assertAllowed(Long userId, AiModelEntity model) {
        if (!Boolean.TRUE.equals(model.getActive())) {
            throw ValidationException.keyed("model.unavailable");
        }
        String planCode = featureGateBiz.resolvePlanCode(userId);
        boolean allowed = planAccessRepo.findByPlanCode(planCode).stream()
            .anyMatch(a -> a.getModelId().equals(model.getId()));
        if (!allowed) {
            throw ValidationException.keyed("model.plan_not_allowed");
        }
    }

    private static ModelPriceTier.Tier parseTierOverride(String override) {
        ModelPriceTier.Tier tier = parseTierMarker(override);
        if (tier == null) {
            throw ValidationException.keyed("model.invalid_tier");
        }
        return tier;
    }

    private static ModelPriceTier.Tier parseTierMarker(String marker) {
        if (marker == null || marker.isBlank()) {
            return null;
        }
        String raw = marker.startsWith(TIER_PREFIX) ? marker.substring(TIER_PREFIX.length()) : marker;
        return switch (raw.toLowerCase()) {
            case "light" -> ModelPriceTier.Tier.LIGHT;
            case "balanced" -> ModelPriceTier.Tier.BALANCED;
            case "extreme" -> ModelPriceTier.Tier.EXTREME;
            default -> null;
        };
    }

    private static double tierDistance(ModelPriceTier.Tier target, BigDecimal multiplier) {
        ModelPriceTier.Tier actual = ModelPriceTier.tierOf(multiplier);
        if (actual == null) {
            return 10.0;
        }
        return Math.abs(actual.ordinal() - target.ordinal());
    }

    private Map<String, Object> fromAiModel(AiModelEntity e, String source) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("model_type", e.getModelType());
        c.put("provider", e.getProvider());
        c.put("protocol", e.getProtocol());
        c.put("model_name", e.getModelName());
        c.put("model", e.getModelName());
        c.put("display_name", e.getDisplayName());
        c.put("base_url", e.getBaseUrl());
        String apiKey;
        if (e.getCredentialId() != null && !e.getCredentialId().isBlank()) {
            AiModelCredentialEntity cred = aiCredentialRepo.findById(e.getCredentialId())
                .orElseThrow(() -> ValidationException.keyed("model.credential_not_found"));
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

