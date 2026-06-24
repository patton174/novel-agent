package cn.novelstudio.module.content.service.model;

import cn.novelstudio.module.content.client.PythonModelTestClient;
import cn.novelstudio.module.content.entity.AiModelCredentialEntity;
import cn.novelstudio.module.content.entity.AiModelEntity;
import cn.novelstudio.module.content.entity.AiModelPlanAccessEntity;
import cn.novelstudio.module.content.repository.AiModelPlanAccessRepository;
import cn.novelstudio.module.content.repository.AiModelRepository;
import cn.novelstudio.module.content.service.model.dto.AiModelDTO;
import cn.novelstudio.module.content.service.model.dto.AiModelUpsertReq;
import cn.novelstudio.module.content.service.model.dto.CredentialUpsertReq;
import cn.novelstudio.module.content.support.ModelKeyCodec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiModelService {

    private final AiModelRepository repo;
    private final AiModelPlanAccessRepository planRepo;
    private final AiModelCredentialService credentialService;
    private final ModelKeyCodec keyCodec;
    private final PythonModelTestClient pythonModelTestClient;

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
        applyReq(e, req, false, true);
        return toDto(repo.save(e));
    }

    private void applyReq(AiModelEntity e, AiModelUpsertReq req, boolean keyRequired) {
        applyReq(e, req, keyRequired, false);
    }

    private void applyReq(AiModelEntity e, AiModelUpsertReq req, boolean keyRequired, boolean partial) {
        if (!partial || req.getCode() != null) {
            e.setCode(req.getCode());
        }
        if (!partial || req.getDisplayName() != null) {
            e.setDisplayName(req.getDisplayName());
        }
        if (!partial || req.getModelType() != null) {
            e.setModelType(req.getModelType());
        }
        if (!partial || req.getModelName() != null) {
            e.setModelName(req.getModelName());
        }
        if (!partial || req.getMaxTokens() != null) {
            e.setMaxTokens(req.getMaxTokens());
        }
        if (!partial || req.getTemperature() != null) {
            e.setTemperature(req.getTemperature());
        }
        if (!partial || req.getInputPricePer1kMicros() != null) {
            e.setInputPricePer1kMicros(req.getInputPricePer1kMicros());
        }
        if (!partial || req.getOutputPricePer1kMicros() != null) {
            e.setOutputPricePer1kMicros(req.getOutputPricePer1kMicros());
        }
        if (req.getPriceMultiplier() != null) {
            ModelPriceTier.requireValidMultiplier(req.getPriceMultiplier());
            e.setPriceMultiplier(req.getPriceMultiplier());
        } else if (!partial) {
            e.setPriceMultiplier(BigDecimal.ONE);
        }
        if (req.getActive() != null) {
            e.setActive(req.getActive());
        } else if (!partial) {
            e.setActive(true);
        }
        if (req.getSortOrder() != null) {
            e.setSortOrder(req.getSortOrder());
        } else if (!partial) {
            e.setSortOrder(0);
        }
        if (!partial || req.getDescription() != null) {
            e.setDescription(req.getDescription());
        }

        if (req.getCredentialId() != null && !req.getCredentialId().isBlank()) {
            AiModelCredentialEntity cred = credentialService.requireCredential(req.getCredentialId());
            credentialService.linkModel(e, cred);
            return;
        }

        if (!partial || req.getProvider() != null) {
            e.setProvider(req.getProvider());
        }
        if (!partial || req.getProtocol() != null) {
            e.setProtocol(req.getProtocol());
        }
        if (!partial || req.getBaseUrl() != null) {
            e.setBaseUrl(req.getBaseUrl());
        }

        if (req.getApiKey() != null && !req.getApiKey().isEmpty()) {
            if (req.getCredentialLabel() != null && !req.getCredentialLabel().isBlank() && !partial) {
                CredentialUpsertReq credReq = new CredentialUpsertReq();
                credReq.setLabel(req.getCredentialLabel().trim());
                credReq.setProvider(e.getProvider());
                credReq.setProtocol(e.getProtocol());
                credReq.setBaseUrl(e.getBaseUrl());
                credReq.setApiKey(req.getApiKey());
                AiModelCredentialEntity cred = credentialService.createEntity(e.getModelType(), credReq);
                credentialService.linkModel(e, cred);
            } else {
                e.setCredentialId(null);
                e.setApiKeyEnc(keyCodec.encrypt(req.getApiKey()));
            }
        } else if (keyRequired && (e.getCredentialId() == null || e.getCredentialId().isBlank())
            && (e.getApiKeyEnc() == null || e.getApiKeyEnc().isBlank())) {
            throw new IllegalArgumentException("apiKey 必填或选择已有连接");
        }
    }

    @Transactional
    public void delete(String id) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("模型不存在");
        }
        repo.deleteById(id);
        planRepo.deleteByModelId(id);
    }

    @Transactional(readOnly = true)
    public List<AiModelDTO> list(String type) {
        List<AiModelEntity> all = (type == null || type.isBlank())
            ? repo.findAll()
            : repo.findByModelTypeAndActiveTrue(type);
        return all.stream()
            .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AiModelDTO get(String id) {
        return toDto(repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在")));
    }

    @Transactional
    public void setPlans(String id, List<String> planCodes) {
        if (!repo.existsById(id)) {
            throw new IllegalArgumentException("模型不存在");
        }
        planRepo.deleteByModelId(id);
        if (planCodes != null) {
            for (String code : planCodes) {
                AiModelPlanAccessEntity a = new AiModelPlanAccessEntity();
                a.setModelId(id);
                a.setPlanCode(code);
                planRepo.save(a);
            }
        }
    }

    @Transactional
    public void setDefault(String id) {
        AiModelEntity target = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        repo.findFirstByModelTypeAndIsDefaultTrueAndActiveTrue(target.getModelType())
            .ifPresent(old -> {
                old.setIsDefault(false);
                repo.save(old);
            });
        target.setIsDefault(true);
        repo.save(target);
    }

    @Transactional(readOnly = true)
    public List<String> plansOf(String id) {
        return planRepo.findByModelId(id).stream()
            .map(AiModelPlanAccessEntity::getPlanCode)
            .collect(Collectors.toList());
    }

    @Transactional
    public void reorder(String type, List<String> ids) {
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("type 必填");
        }
        if (ids == null || ids.isEmpty()) {
            return;
        }
        for (int i = 0; i < ids.size(); i++) {
            String id = ids.get(i);
            AiModelEntity e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在: " + id));
            if (!type.equals(e.getModelType())) {
                throw new IllegalArgumentException("模型类型不匹配: " + id);
            }
            e.setSortOrder(i);
            repo.save(e);
        }
    }

    @Transactional(readOnly = true)
    public AiModelEntity getEntity(String id) {
        return repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在"));
    }

    public Map<String, Object> testConnectivity(String id) {
        AiModelEntity e = repo.findById(id).orElseThrow(() -> new IllegalArgumentException("模型不存在"));
        long start = System.currentTimeMillis();
        Map<String, Object> result = new HashMap<>();
        try {
            Map<String, Object> remote = pythonModelTestClient.test(toActiveConfig(e));
            result.putAll(remote);
        } catch (Exception ex) {
            result.put("ok", false);
            result.put("error", ex.getMessage() != null ? ex.getMessage() : "连通检查失败");
        }
        result.put("latencyMs", System.currentTimeMillis() - start);
        return result;
    }

    public Map<String, Object> toActiveConfig(AiModelEntity e) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("code", e.getCode());
        c.put("model_type", e.getModelType());
        c.put("provider", e.getProvider());
        c.put("protocol", e.getProtocol());
        c.put("model_name", e.getModelName());
        c.put("model", e.getModelName());
        c.put("base_url", e.getBaseUrl());
        c.put("api_key", credentialService.resolveApiKey(e));
        c.put("max_tokens", e.getMaxTokens());
        c.put("temperature", e.getTemperature());
        c.put("pricing", buildPricing(e));
        return c;
    }

    private Map<String, Object> buildPricing(AiModelEntity e) {
        Map<String, Object> pricing = new LinkedHashMap<>();
        pricing.put("input_per_1k_micros", e.getInputPricePer1kMicros());
        pricing.put("output_per_1k_micros", e.getOutputPricePer1kMicros());
        pricing.put("multiplier", e.getPriceMultiplier());
        return pricing;
    }

    public AiModelDTO toDto(AiModelEntity e) {
        AiModelDTO d = new AiModelDTO();
        d.setId(e.getId());
        d.setCode(e.getCode());
        d.setDisplayName(e.getDisplayName());
        d.setModelType(e.getModelType());
        d.setProvider(e.getProvider());
        d.setProtocol(e.getProtocol());
        d.setModelName(e.getModelName());
        d.setBaseUrl(e.getBaseUrl());
        d.setCredentialId(e.getCredentialId());
        if (e.getCredentialId() != null) {
            d.setCredentialLabel(credentialService.credentialLabel(e.getCredentialId()));
        }
        d.setApiKeyMasked(credentialService.maskForModel(e));
        d.setMaxTokens(e.getMaxTokens());
        d.setTemperature(e.getTemperature());
        d.setInputPricePer1kMicros(e.getInputPricePer1kMicros());
        d.setOutputPricePer1kMicros(e.getOutputPricePer1kMicros());
        d.setPriceMultiplier(e.getPriceMultiplier());
        d.setActive(e.getActive());
        d.setIsDefault(e.getIsDefault());
        d.setSortOrder(e.getSortOrder());
        d.setDescription(e.getDescription());
        d.setPlanCodes(plansOf(e.getId()));
        return d;
    }
}
