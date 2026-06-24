package cn.novelstudio.module.content.service.model;

import cn.novelstudio.module.content.entity.AiModelCredentialEntity;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.repository.AiModelCredentialRepository;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.service.model.dto.CredentialUpsertReq;
import cn.novelstudio.module.content.service.model.dto.ModelCredentialDTO;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiModelCredentialService {

    private final AiModelCredentialRepository credentialRepo;
    private final AiModelRepository modelRepo;
    private final ModelKeyCodec keyCodec;

    @Transactional(readOnly = true)
    public List<ModelCredentialDTO> list(String modelType) {
        return credentialRepo.findByModelTypeOrderByCreatedAtAsc(modelType).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional
    public ModelCredentialDTO create(String modelType, CredentialUpsertReq req) {
        return toDto(createEntity(modelType, req));
    }

    @Transactional
    public AiModelCredentialEntity createEntity(String modelType, CredentialUpsertReq req) {
        requireFields(req, true);
        AiModelCredentialEntity cred = new AiModelCredentialEntity();
        cred.setModelType(modelType);
        applyFields(cred, req, true);
        return credentialRepo.save(cred);
    }

    @Transactional
    public ModelCredentialDTO update(String id, CredentialUpsertReq req) {
        AiModelCredentialEntity cred = requireCredential(id);
        requireFields(req, false);
        applyFields(cred, req, false);
        credentialRepo.save(cred);
        syncLinkedModels(cred);
        return toDto(cred);
    }

    @Transactional
    public void delete(String id) {
        AiModelCredentialEntity cred = requireCredential(id);
        long linked = modelRepo.countByCredentialId(id);
        if (linked > 0) {
            throw new IllegalArgumentException("该连接下仍有 " + linked + " 个模型，请先删除模型");
        }
        credentialRepo.delete(cred);
    }

    @Transactional(readOnly = true)
    public AiModelCredentialEntity requireCredential(String id) {
        return credentialRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("API 连接不存在"));
    }

    public String credentialLabel(String credentialId) {
        return credentialRepo.findById(credentialId)
            .map(AiModelCredentialEntity::getLabel)
            .orElse(null);
    }

    public void linkModel(AiModelEntity model, AiModelCredentialEntity cred) {
        if (!cred.getModelType().equals(model.getModelType())) {
            throw new IllegalArgumentException("连接类型与模型类型不一致");
        }
        model.setCredentialId(cred.getId());
        model.setProvider(cred.getProvider());
        model.setProtocol(cred.getProtocol());
        model.setBaseUrl(cred.getBaseUrl());
        model.setApiKeyEnc(null);
    }

    public String resolveApiKey(AiModelEntity model) {
        if (model.getCredentialId() != null && !model.getCredentialId().isBlank()) {
            AiModelCredentialEntity cred = requireCredential(model.getCredentialId());
            return keyCodec.decrypt(cred.getApiKeyEnc());
        }
        if (model.getApiKeyEnc() == null || model.getApiKeyEnc().isBlank()) {
            throw new IllegalStateException("模型未配置 API Key");
        }
        return keyCodec.decrypt(model.getApiKeyEnc());
    }

    public String maskForModel(AiModelEntity model) {
        if (model.getCredentialId() != null && !model.getCredentialId().isBlank()) {
            return credentialRepo.findById(model.getCredentialId())
                .map(c -> maskKey(keyCodec.decrypt(c.getApiKeyEnc())))
                .orElse("****");
        }
        if (model.getApiKeyEnc() == null || model.getApiKeyEnc().isBlank()) {
            return "****";
        }
        return maskKey(keyCodec.decrypt(model.getApiKeyEnc()));
    }

    private void syncLinkedModels(AiModelCredentialEntity cred) {
        for (AiModelEntity linked : modelRepo.findByCredentialId(cred.getId())) {
            linked.setProvider(cred.getProvider());
            linked.setProtocol(cred.getProtocol());
            linked.setBaseUrl(cred.getBaseUrl());
            modelRepo.save(linked);
        }
    }

    private void requireFields(CredentialUpsertReq req, boolean creating) {
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

    private void applyFields(AiModelCredentialEntity cred, CredentialUpsertReq req, boolean creating) {
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

    private ModelCredentialDTO toDto(AiModelCredentialEntity e) {
        ModelCredentialDTO d = new ModelCredentialDTO();
        d.setId(e.getId());
        d.setLabel(e.getLabel());
        d.setProvider(e.getProvider());
        d.setProtocol(e.getProtocol());
        d.setBaseUrl(e.getBaseUrl());
        d.setApiKeyMasked(maskKey(keyCodec.decrypt(e.getApiKeyEnc())));
        d.setModelCount((int) modelRepo.countByCredentialId(e.getId()));
        return d;
    }

    private String maskKey(String plain) {
        if (plain == null || plain.length() <= 8) {
            return "****";
        }
        return plain.substring(0, 3) + "****" + plain.substring(plain.length() - 4);
    }
}
