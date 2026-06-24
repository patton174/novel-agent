package cn.novelstudio.module.content.service.auth.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.billing.service.biz.FeatureGateBiz;
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
        List<UserModelDTO> byok = userModelRepo.findByUserIdAndModelType(userId, t).stream()
            .filter(e -> Boolean.TRUE.equals(e.getByok()))
            .map(this::toUserDto)
            .collect(Collectors.toList());
        List<ModelCredentialDTO> credentials = credentialRepo.findByUserIdOrderByCreatedAtAsc(userId).stream()
            .map(this::toCredentialDto)
            .collect(Collectors.toList());
        AvailableModelsDTO dto = new AvailableModelsDTO();
        dto.setPublicModels(publicModels);
        dto.setByok(byok);
        dto.setCredentials(credentials);
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

    @Transactional
    public Result<Void> setDefault(Long userId, String type, String userModelId) {
        String t = type == null ? "llm" : type;
        userModelRepo.findByUserIdAndModelTypeAndIsDefaultTrue(userId, t).ifPresent(old -> {
            old.setIsDefault(false);
            userModelRepo.save(old);
        });
        UserModelEntity e = userModelRepo.findById(userModelId)
            .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        if (!e.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权操作");
        }
        e.setIsDefault(true);
        userModelRepo.save(e);
        return ok();
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
            throw new IllegalArgumentException("该连接下仍有 " + linked + " 个模型，请先删除模型");
        }
        credentialRepo.delete(cred);
        return ok();
    }

    @Transactional
    public Result<UserModelDTO> createByok(Long userId, ByokUpsertReq req) {
        if (req.getLabel() == null || req.getLabel().isBlank()) {
            throw new IllegalArgumentException("请填写模型名称");
        }
        UserModelEntity e = new UserModelEntity();
        e.setUserId(userId);
        e.setModelType(req.getModelType() == null ? "llm" : req.getModelType());
        e.setByok(true);
        e.setLabel(req.getLabel());
        e.setModelName(req.getModelName() == null || req.getModelName().isBlank()
            ? req.getLabel() : req.getModelName());

        if (req.getCredentialId() != null && !req.getCredentialId().isBlank()) {
            UserModelCredentialEntity cred = requireOwnedCredential(userId, req.getCredentialId());
            linkModelToCredential(e, cred);
        } else {
            if (req.getApiKey() == null || req.getApiKey().isBlank()) {
                throw new IllegalArgumentException("请填写 API Key 或选择已有连接");
            }
            requireConnectionFields(req);
            UserModelCredentialEntity cred = new UserModelCredentialEntity();
            cred.setUserId(userId);
            cred.setLabel(resolveCredentialLabel(req));
            cred.setProvider(req.getProvider());
            cred.setProtocol(req.getProtocol());
            cred.setBaseUrl(req.getBaseUrl());
            cred.setApiKeyEnc(keyCodec.encrypt(req.getApiKey()));
            cred = credentialRepo.save(cred);
            linkModelToCredential(e, cred);
        }
        return ok(toUserDto(userModelRepo.save(e)));
    }

    @Transactional
    public Result<UserModelDTO> updateByok(Long userId, String id, ByokUpsertReq req) {
        UserModelEntity e = userModelRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        if (!e.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权操作");
        }
        if (req.getLabel() == null || req.getLabel().isBlank()) {
            throw new IllegalArgumentException("请填写模型名称");
        }
        e.setLabel(req.getLabel());
        e.setModelName(req.getModelName() == null || req.getModelName().isBlank()
            ? req.getLabel() : req.getModelName());

        if (req.getCredentialId() != null && !req.getCredentialId().isBlank()
            && !req.getCredentialId().equals(e.getCredentialId())) {
            UserModelCredentialEntity cred = requireOwnedCredential(userId, req.getCredentialId());
            linkModelToCredential(e, cred);
        } else if (e.getCredentialId() == null || e.getCredentialId().isBlank()) {
            if (req.getProvider() != null) {
                e.setProvider(req.getProvider());
            }
            if (req.getProtocol() != null) {
                e.setProtocol(req.getProtocol());
            }
            if (req.getBaseUrl() != null) {
                e.setBaseUrl(req.getBaseUrl());
            }
            if (req.getApiKey() != null && !req.getApiKey().isEmpty()) {
                e.setApiKeyEnc(keyCodec.encrypt(req.getApiKey()));
            }
        }
        return ok(toUserDto(userModelRepo.save(e)));
    }

    @Transactional
    public Result<Void> deleteByok(Long userId, String id) {
        UserModelEntity e = userModelRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        if (!e.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权操作");
        }
        userModelRepo.delete(e);
        return ok();
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
            .orElseThrow(() -> new IllegalArgumentException("API 连接不存在"));
        if (!cred.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权操作");
        }
        return cred;
    }

    private void requireConnectionFields(ByokUpsertReq req) {
        if (req.getProvider() == null || req.getProvider().isBlank()
            || req.getProtocol() == null || req.getProtocol().isBlank()
            || req.getBaseUrl() == null || req.getBaseUrl().isBlank()) {
            throw new IllegalArgumentException("请填写提供商、协议与 API 地址");
        }
    }

    private void requireCredentialFields(CredentialUpsertReq req, boolean creating) {
        if (req.getLabel() == null || req.getLabel().isBlank()) {
            throw new IllegalArgumentException("请填写连接名称");
        }
        if (creating && (req.getApiKey() == null || req.getApiKey().isBlank())) {
            throw new IllegalArgumentException("请填写 API Key");
        }
        if (req.getProvider() == null || req.getProvider().isBlank()
            || req.getProtocol() == null || req.getProtocol().isBlank()
            || req.getBaseUrl() == null || req.getBaseUrl().isBlank()) {
            throw new IllegalArgumentException("请填写提供商、协议与 API 地址");
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
            throw new IllegalArgumentException("请填写 API Key");
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
