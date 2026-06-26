package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.exception.ForbiddenException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.entity.AiModelPlanAccessEntity;
import cn.novelstudio.module.content.entity.UserModelCredentialEntity;
import cn.novelstudio.module.content.entity.UserModelEntity;
import cn.novelstudio.module.content.repository.AiModelPlanAccessRepository;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.repository.UserModelCredentialRepository;
import cn.novelstudio.module.content.repository.UserModelRepository;
import cn.novelstudio.module.content.service.model.AiModelService;
import cn.novelstudio.module.content.service.model.dto.AiModelDTO;
import cn.novelstudio.module.content.service.model.dto.AvailableModelsDTO;
import cn.novelstudio.module.content.service.model.dto.ByokUpsertReq;
import cn.novelstudio.module.content.service.model.dto.CredentialUpsertReq;
import cn.novelstudio.module.content.service.model.dto.ModelCredentialDTO;
import cn.novelstudio.module.content.service.model.dto.UserModelDTO;
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
    private final UserModelCredentialRepository credentialRepo;
    private final ModelKeyCodec keyCodec;
    private final FeatureGateBiz featureGateBiz;
    private final AiModelService aiModelService;

    @Transactional(readOnly = true)
    public Result<AvailableModelsDTO> available(Long userId, String type) {
        String t = type == null ? "llm" : type;
        String planCode = featureGateBiz.resolvePlanCode(userId);
        List<String> allowedModelIds = planAccessRepo.findByPlanCode(planCode).stream()
            .map(AiModelPlanAccessEntity::getModelId)
            .collect(Collectors.toList());
        List<AiModelDTO> publicModels = aiModelRepo.findAllById(allowedModelIds).stream()
            .filter(e -> t.equals(e.getModelType()) && Boolean.TRUE.equals(e.getActive()))
            .map(aiModelService::toDto)
            .collect(Collectors.toList());
        AvailableModelsDTO dto = new AvailableModelsDTO();
        dto.setPublicModels(publicModels);
        dto.setByok(List.of());
        dto.setCredentials(List.of());
        return ok(dto);
    }

    @Transactional(readOnly = true)
    public Result<List<ModelCredentialDTO>> listCredentials(Long userId) {
        return ok(credentialRepo.findByUserIdOrderByCreatedAtAsc(userId).stream()
            .map(this::toCredentialDto)
            .collect(Collectors.toList()));
    }

    @Transactional(readOnly = true)
    public Result<UserModelDTO> defaultModel(Long userId, String type) {
        String t = type == null ? "llm" : type;
        return ok(userModelRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, t)
            .map(this::toUserDto)
            .orElse(null));
    }

    private static final String AUTO_MARKER = "auto";
    private static final String TIER_PREFIX = "tier:";

    @Transactional
    public Result<Void> setDefault(Long userId, String type, String userModelId) {
        String t = type == null ? "llm" : type;
        clearDefault(userId, t);

        if (userModelId == null || userModelId.isBlank()) {
            upsertTierPreference(userId, t, tierMarkerForPlatformDefault(t));
            return ok();
        }

        if (AUTO_MARKER.equals(userModelId)) {
            upsertAutoPreference(userId, t);
            return ok();
        }

        if (userModelId.startsWith(TIER_PREFIX)) {
            upsertTierPreference(userId, t, userModelId);
            return ok();
        }

        if (userModelId.startsWith("pub:")) {
            String publicId = userModelId.substring(4);
            AiModelEntity m = aiModelRepo.findById(publicId)
                .orElseThrow(() -> ValidationException.keyed("model.not_found"));
            if (!Boolean.TRUE.equals(m.getActive()) || !t.equals(m.getModelType())) {
            throw ValidationException.keyed("model.unavailable");
            }
            upsertTierPreference(userId, t, tierMarkerForModel(m));
            return ok();
        }

        throw ValidationException.keyed("model.tier_auto_only");
    }

    private String tierMarkerForPlatformDefault(String modelType) {
        AiModelEntity platformDefault = aiModelRepo.findFirstByModelTypeAndIsDefaultTrueAndActiveTrue(modelType)
            .orElseThrow(() -> ValidationException.keyed("model.no_platform_default"));
        return tierMarkerForModel(platformDefault);
    }

    private String tierMarkerForModel(AiModelEntity model) {
        var tier = cn.novelstudio.module.content.service.model.ModelPriceTier.tierOf(model.getPriceMultiplier());
        if (tier == null) {
            return TIER_PREFIX + "balanced";
        }
        return TIER_PREFIX + tier.name().toLowerCase();
    }

    private void upsertTierPreference(Long userId, String type, String tierMarker) {
        UserModelEntity e = userModelRepo.findByUserIdAndModelType(userId, type).stream()
            .filter(u -> !Boolean.TRUE.equals(u.getByok())
                && u.getPublicModelId() == null
                && tierMarker.equals(u.getModelName()))
            .findFirst()
            .orElseGet(() -> {
                UserModelEntity n = new UserModelEntity();
                n.setUserId(userId);
                n.setModelType(type);
                n.setByok(false);
                return n;
            });
        e.setPublicModelId(null);
        e.setModelName(tierMarker);
        e.setLabel(tierMarker);
        e.setIsDefault(true);
        userModelRepo.save(e);
    }

    private void clearDefault(Long userId, String type) {
        userModelRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, type).ifPresent(old -> {
            old.setIsDefault(false);
            userModelRepo.save(old);
        });
    }

    private void upsertPublicPreference(Long userId, String type, String publicModelId, String label) {
        AiModelEntity m = aiModelRepo.findById(publicModelId).orElse(null);
        if (m != null) {
            upsertTierPreference(userId, type, tierMarkerForModel(m));
            return;
        }
        UserModelEntity e = userModelRepo
            .findByUserIdAndModelTypeAndPublicModelId(userId, type, publicModelId)
            .orElseGet(() -> {
                UserModelEntity n = new UserModelEntity();
                n.setUserId(userId);
                n.setModelType(type);
                n.setByok(false);
                return n;
            });
        e.setPublicModelId(publicModelId);
        e.setLabel(label);
        e.setModelName(null);
        e.setIsDefault(true);
        userModelRepo.save(e);
    }

    private void upsertAutoPreference(Long userId, String type) {
        UserModelEntity e = userModelRepo.findByUserIdAndModelType(userId, type).stream()
            .filter(u -> !Boolean.TRUE.equals(u.getByok())
                && u.getPublicModelId() == null
                && AUTO_MARKER.equals(u.getModelName()))
            .findFirst()
            .orElseGet(() -> {
                UserModelEntity n = new UserModelEntity();
                n.setUserId(userId);
                n.setModelType(type);
                n.setByok(false);
                return n;
            });
        e.setPublicModelId(null);
        e.setModelName(AUTO_MARKER);
        e.setLabel(AUTO_MARKER);
        e.setIsDefault(true);
        userModelRepo.save(e);
    }

    @Transactional
    public Result<ModelCredentialDTO> createCredential(Long userId, CredentialUpsertReq req) {
        requireCredentialFields(req, true);
        UserModelCredentialEntity cred = new UserModelCredentialEntity();
        cred.setUserId(userId);
        applyCredentialFields(cred, req, true);
        return ok(toCredentialDto(credentialRepo.save(cred)));
    }

    @Transactional
    public Result<ModelCredentialDTO> updateCredential(Long userId, String id, CredentialUpsertReq req) {
        UserModelCredentialEntity cred = requireOwnedCredential(userId, id);
        requireCredentialFields(req, false);
        applyCredentialFields(cred, req, false);
        credentialRepo.save(cred);
        syncLinkedModelsFromCredential(cred);
        return ok(toCredentialDto(cred));
    }

    @Transactional
    public Result<Void> deleteCredential(Long userId, String id) {
        UserModelCredentialEntity cred = requireOwnedCredential(userId, id);
        long linked = userModelRepo.countByCredentialId(id);
        if (linked > 0) {
            throw ValidationException.keyed("model.connection_has_models", linked);
        }
        credentialRepo.delete(cred);
        return ok();
    }

    @Transactional
    public Result<UserModelDTO> createByok(Long userId, ByokUpsertReq req) {
        throw ValidationException.keyed("model.private_model_disabled");
    }

    @Transactional
    public Result<UserModelDTO> updateByok(Long userId, String id, ByokUpsertReq req) {
        throw ValidationException.keyed("model.private_model_disabled");
    }

    @Transactional
    public Result<Void> deleteByok(Long userId, String id) {
        throw ValidationException.keyed("model.private_model_disabled");
    }

    private void linkModelToCredential(UserModelEntity model, UserModelCredentialEntity cred) {
        model.setCredentialId(cred.getId());
        model.setProvider(cred.getProvider());
        model.setProtocol(cred.getProtocol());
        model.setBaseUrl(cred.getBaseUrl());
        model.setApiKeyEnc(null);
    }

    private void syncLinkedModelsFromCredential(UserModelCredentialEntity cred) {
        for (UserModelEntity linked : userModelRepo.findByCredentialId(cred.getId())) {
            linked.setProvider(cred.getProvider());
            linked.setProtocol(cred.getProtocol());
            linked.setBaseUrl(cred.getBaseUrl());
            userModelRepo.save(linked);
        }
    }

    private UserModelCredentialEntity requireOwnedCredential(Long userId, String id) {
        UserModelCredentialEntity cred = credentialRepo.findById(id)
            .orElseThrow(() -> ValidationException.keyed("model.credential_not_found"));
        if (!cred.getUserId().equals(userId)) {
            throw ForbiddenException.keyed("model.forbidden");
        }
        return cred;
    }

    private void requireConnectionFields(ByokUpsertReq req) {
        if (req.getProvider() == null || req.getProvider().isBlank()
            || req.getProtocol() == null || req.getProtocol().isBlank()
            || req.getBaseUrl() == null || req.getBaseUrl().isBlank()) {
            throw ValidationException.keyed("model.provider_required");
        }
    }

    private void requireCredentialFields(CredentialUpsertReq req, boolean creating) {
        if (req.getLabel() == null || req.getLabel().isBlank()) {
            throw ValidationException.keyed("model.connection_name_required");
        }
        if (creating && (req.getApiKey() == null || req.getApiKey().isBlank())) {
            throw ValidationException.keyed("model.api_key_required");
        }
        if (req.getProvider() == null || req.getProvider().isBlank()
            || req.getProtocol() == null || req.getProtocol().isBlank()
            || req.getBaseUrl() == null || req.getBaseUrl().isBlank()) {
            throw ValidationException.keyed("model.provider_required");
        }
    }

    private void applyCredentialFields(UserModelCredentialEntity cred, CredentialUpsertReq req, boolean creating) {
        cred.setLabel(req.getLabel());
        cred.setProvider(req.getProvider());
        cred.setProtocol(req.getProtocol());
        cred.setBaseUrl(req.getBaseUrl());
        if (req.getApiKey() != null && !req.getApiKey().isEmpty()) {
            cred.setApiKeyEnc(keyCodec.encrypt(req.getApiKey()));
        } else if (creating) {
            throw ValidationException.keyed("model.api_key_required");
        }
    }

    private String resolveCredentialLabel(ByokUpsertReq req) {
        if (req.getCredentialLabel() != null && !req.getCredentialLabel().isBlank()) {
            return req.getCredentialLabel().trim();
        }
        if (req.getLabel() != null && !req.getLabel().isBlank()) {
            return req.getLabel().trim();
        }
        return req.getProvider();
    }

    private ModelCredentialDTO toCredentialDto(UserModelCredentialEntity e) {
        ModelCredentialDTO d = new ModelCredentialDTO();
        d.setId(e.getId());
        d.setLabel(e.getLabel());
        d.setProvider(e.getProvider());
        d.setProtocol(e.getProtocol());
        d.setBaseUrl(e.getBaseUrl());
        d.setApiKeyMasked(maskKey(keyCodec.decrypt(e.getApiKeyEnc())));
        d.setModelCount((int) userModelRepo.countByCredentialId(e.getId()));
        return d;
    }

    private UserModelDTO toUserDto(UserModelEntity e) {
        UserModelDTO d = new UserModelDTO();
        d.setId(e.getId());
        d.setModelType(e.getModelType());
        d.setPublicModelId(e.getPublicModelId());
        d.setLabel(e.getLabel());
        d.setProvider(e.getProvider());
        d.setProtocol(e.getProtocol());
        d.setModelName(e.getModelName());
        d.setBaseUrl(e.getBaseUrl());
        d.setCredentialId(e.getCredentialId());
        d.setByok(e.getByok());
        d.setIsDefault(e.getIsDefault());
        if (e.getCredentialId() != null) {
            credentialRepo.findById(e.getCredentialId())
                .ifPresent(c -> d.setCredentialLabel(c.getLabel()));
        }
        if (e.getPublicModelId() != null) {
            aiModelRepo.findById(e.getPublicModelId())
                .ifPresent(m -> d.setPublicModel(aiModelService.toDto(m)));
        }
        return d;
    }

    private String maskKey(String plain) {
        if (plain == null || plain.length() <= 8) {
            return "****";
        }
        return plain.substring(0, 3) + "****" + plain.substring(plain.length() - 4);
    }
}
