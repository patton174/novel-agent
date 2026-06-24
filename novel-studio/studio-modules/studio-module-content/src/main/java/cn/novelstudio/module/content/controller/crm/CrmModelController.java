package cn.novelstudio.module.content.controller.crm;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.service.crm.biz.CrmModelBiz;
import cn.novelstudio.module.content.service.model.dto.AiModelDTO;
import cn.novelstudio.module.content.service.model.dto.AiModelUpsertReq;
import cn.novelstudio.module.content.service.model.dto.CredentialUpsertReq;
import cn.novelstudio.module.content.service.model.dto.ModelCredentialDTO;
import cn.novelstudio.platform.web.AuthRoleSupport;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/content/crm/model")
@RequiredArgsConstructor
public class CrmModelController extends BaseController {

    private final CrmModelBiz biz;

    @PostMapping
    public Result<AiModelDTO> create(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @Valid @RequestBody AiModelUpsertReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.create(req);
    }

    @PutMapping("/{id}")
    public Result<AiModelDTO> update(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id,
        @Valid @RequestBody AiModelUpsertReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.update(id, req);
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.delete(id);
    }

    @GetMapping
    public Result<List<AiModelDTO>> list(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam(required = false) String type
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.list(type);
    }

    @GetMapping("/{id}")
    public Result<AiModelDTO> get(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.get(id);
    }

    @PutMapping("/{id}/plans")
    public Result<Void> setPlans(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id,
        @RequestBody Map<String, List<String>> body
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.setPlans(id, body.get("planCodes"));
    }

    @PostMapping("/{id}/default")
    public Result<Void> setDefault(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.setDefault(id);
    }

    @PostMapping("/{id}/test")
    public Result<Map<String, Object>> test(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.test(id);
    }

    @PutMapping("/reorder")
    public Result<Void> reorder(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestBody Map<String, Object> body
    ) {
        AuthRoleSupport.requireAdmin(roles);
        String type = (String) body.get("type");
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) body.get("ids");
        return biz.reorder(type, ids);
    }

    @GetMapping("/credentials")
    public Result<List<ModelCredentialDTO>> listCredentials(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam String type
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.listCredentials(type);
    }

    @PostMapping("/credentials")
    public Result<ModelCredentialDTO> createCredential(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @RequestParam String type,
        @Valid @RequestBody CredentialUpsertReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.createCredential(type, req);
    }

    @PutMapping("/credentials/{id}")
    public Result<ModelCredentialDTO> updateCredential(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id,
        @Valid @RequestBody CredentialUpsertReq req
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.updateCredential(id, req);
    }

    @DeleteMapping("/credentials/{id}")
    public Result<Void> deleteCredential(
        @RequestHeader(value = "X-User-Roles", required = false) String roles,
        @PathVariable String id
    ) {
        AuthRoleSupport.requireAdmin(roles);
        return biz.deleteCredential(id);
    }
}
