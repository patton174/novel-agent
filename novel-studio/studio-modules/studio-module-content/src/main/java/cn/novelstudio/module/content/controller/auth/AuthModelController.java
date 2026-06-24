package cn.novelstudio.module.content.controller.auth;

import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.content.service.auth.biz.AuthModelBiz;
import cn.novelstudio.module.content.service.model.dto.AvailableModelsDTO;
import cn.novelstudio.module.content.service.model.dto.ByokUpsertReq;
import cn.novelstudio.module.content.service.model.dto.CredentialUpsertReq;
import cn.novelstudio.module.content.service.model.dto.ModelCredentialDTO;
import cn.novelstudio.module.content.service.model.dto.UserModelDTO;
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
@RequestMapping("/api/content/auth/model")
@RequiredArgsConstructor
public class AuthModelController extends BaseController {

    private final AuthModelBiz biz;

    @GetMapping("/available")
    public Result<AvailableModelsDTO> available(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(required = false) String type
    ) {
        return biz.available(parseUserId(userId), type);
    }

    @GetMapping("/default")
    public Result<UserModelDTO> defaultModel(
        @RequestHeader("X-User-Id") String userId,
        @RequestParam(required = false) String type
    ) {
        return biz.defaultModel(parseUserId(userId), type);
    }

    @PutMapping("/default")
    public Result<Void> setDefault(
        @RequestHeader("X-User-Id") String userId,
        @RequestBody Map<String, String> body
    ) {
        return biz.setDefault(parseUserId(userId), body.get("type"), body.get("userModelId"));
    }

    @PostMapping("/byok")
    public Result<UserModelDTO> createByok(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody ByokUpsertReq req
    ) {
        return biz.createByok(parseUserId(userId), req);
    }

    @PutMapping("/byok/{id}")
    public Result<UserModelDTO> updateByok(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String id,
        @Valid @RequestBody ByokUpsertReq req
    ) {
        return biz.updateByok(parseUserId(userId), id, req);
    }

    @DeleteMapping("/byok/{id}")
    public Result<Void> deleteByok(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String id
    ) {
        return biz.deleteByok(parseUserId(userId), id);
    }

    @GetMapping("/credentials")
    public Result<List<ModelCredentialDTO>> listCredentials(
        @RequestHeader("X-User-Id") String userId
    ) {
        return biz.listCredentials(parseUserId(userId));
    }

    @PostMapping("/credentials")
    public Result<ModelCredentialDTO> createCredential(
        @RequestHeader("X-User-Id") String userId,
        @Valid @RequestBody CredentialUpsertReq req
    ) {
        return biz.createCredential(parseUserId(userId), req);
    }

    @PutMapping("/credentials/{id}")
    public Result<ModelCredentialDTO> updateCredential(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String id,
        @Valid @RequestBody CredentialUpsertReq req
    ) {
        return biz.updateCredential(parseUserId(userId), id, req);
    }

    @DeleteMapping("/credentials/{id}")
    public Result<Void> deleteCredential(
        @RequestHeader("X-User-Id") String userId,
        @PathVariable String id
    ) {
        return biz.deleteCredential(parseUserId(userId), id);
    }
}
