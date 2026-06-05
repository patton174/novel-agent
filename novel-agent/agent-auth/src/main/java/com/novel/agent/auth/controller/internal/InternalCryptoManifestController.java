package com.novel.agent.auth.controller.internal;

import com.novel.agent.auth.service.CryptoManifestService;
import com.novel.agent.auth.service.FrontendCryptoRegisterService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/internal/crypto")
public class InternalCryptoManifestController {

    @Autowired
    private CryptoManifestService cryptoManifestService;

    @Autowired
    private FrontendCryptoRegisterService frontendCryptoRegisterService;

    @Value("${agent.internal-service-key:}")
    private String internalServiceKey;

    @PostMapping("/manifest")
    public void publish(
        @RequestHeader(value = "X-Internal-Service-Key", required = false) String key,
        @Valid @RequestBody PublishManifestRequest request
    ) {
        verifyInternal(key);
        cryptoManifestService.publish(request.getManifest(), request.getTtlSec());
    }

    /**
     * 前端服务器（Worker）每日 cron / 部署时调用：后端签发 bootstrap 密钥，Worker 写入 env + runtime.json。
     */
    @PostMapping("/register-frontend-server")
    public FrontendCryptoRegisterService.CryptoRuntimeView registerFrontendServer(
        @RequestHeader(value = "X-Internal-Service-Key", required = false) String key,
        @RequestBody(required = false) RegisterFrontendServerRequest request
    ) {
        verifyInternal(key);
        RegisterFrontendServerRequest body = request == null ? new RegisterFrontendServerRequest() : request;
        if (body.getManifest() != null) {
            cryptoManifestService.publish(body.getManifest(), body.getTtlSec());
        }
        return frontendCryptoRegisterService.registerFromFrontendServer(body.getHost(), body.getTtlSec());
    }

    private void verifyInternal(String key) {
        if (internalServiceKey == null || internalServiceKey.isBlank()
            || key == null || !internalServiceKey.equals(key)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
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
