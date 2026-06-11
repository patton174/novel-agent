package cn.novelstudio.module.auth.controller.internal;

import cn.novelstudio.module.auth.service.CryptoManifestService;
import cn.novelstudio.module.auth.service.FrontendCryptoRegisterService;
import cn.novelstudio.module.auth.service.internal.InternalCryptoBiz;
import cn.novelstudio.platform.web.BaseController;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/crypto")
@RequiredArgsConstructor
public class InternalCryptoManifestController extends BaseController {

    private final InternalCryptoBiz biz;

    @PostMapping("/manifest")
    public void publish(@Valid @RequestBody PublishManifestRequest request) {
        biz.publishManifest(request.getManifest(), request.getTtlSec());
    }

    /**
     * 前端服务器（Worker）每日 cron / 部署时调用：后端签发 bootstrap 密钥，Worker 写入 env + runtime.json。
     */
    @PostMapping("/register-frontend-server")
    public FrontendCryptoRegisterService.CryptoRuntimeView registerFrontendServer(
        @RequestBody(required = false) RegisterFrontendServerRequest request
    ) {
        RegisterFrontendServerRequest body = request == null ? new RegisterFrontendServerRequest() : request;
        return biz.registerFrontendServer(body.getHost(), body.getTtlSec(), body.getManifest());
    }

    @Data
    public static class PublishManifestRequest {
        @NotNull
        private CryptoManifestService.CryptoManifestView manifest;
        private long ttlSec = 86400L * 2;
    }

    @Data
    public static class RegisterFrontendServerRequest {
        private String host = "worker";
        private long ttlSec = 86400L * 2;
        private CryptoManifestService.CryptoManifestView manifest;
    }
}
