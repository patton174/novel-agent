package cn.novelstudio.module.content.service.crm.biz;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import cn.novelstudio.module.content.service.model.AiModelCredentialService;
import cn.novelstudio.module.content.service.model.AiModelService;
import cn.novelstudio.module.content.service.model.dto.AiModelDTO;
import cn.novelstudio.module.content.service.model.dto.AiModelUpsertReq;
import cn.novelstudio.module.content.service.model.dto.CredentialUpsertReq;
import cn.novelstudio.module.content.service.model.dto.ModelCredentialDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class CrmModelBiz extends BaseBiz {

    private final AiModelService aiModelService;
    private final AiModelCredentialService credentialService;

    public Result<AiModelDTO> create(AiModelUpsertReq req) {
        return ok(aiModelService.create(req));
    }

    public Result<AiModelDTO> update(String id, AiModelUpsertReq req) {
        return ok(aiModelService.update(id, req));
    }

    public Result<Void> delete(String id) {
        aiModelService.delete(id);
        return ok();
    }

    public Result<List<AiModelDTO>> list(String type) {
        return ok(aiModelService.list(type));
    }

    public Result<AiModelDTO> get(String id) {
        return ok(aiModelService.get(id));
    }

    public Result<Void> setPlans(String id, List<String> planCodes) {
        aiModelService.setPlans(id, planCodes);
        return ok();
    }

    public Result<Void> setDefault(String id) {
        aiModelService.setDefault(id);
        return ok();
    }

    public Result<Map<String, Object>> test(String id) {
        return ok(aiModelService.testConnectivity(id));
    }

    public Result<Void> reorder(String type, List<String> ids) {
        aiModelService.reorder(type, ids);
        return ok();
    }

    public Result<List<ModelCredentialDTO>> listCredentials(String type) {
        return ok(credentialService.list(type));
    }

    public Result<ModelCredentialDTO> createCredential(String type, CredentialUpsertReq req) {
        return ok(credentialService.create(type, req));
    }

    public Result<ModelCredentialDTO> updateCredential(String id, CredentialUpsertReq req) {
        return ok(credentialService.update(id, req));
    }

    public Result<Void> deleteCredential(String id) {
        credentialService.delete(id);
        return ok();
    }
}
