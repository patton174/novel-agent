package com.novel.agent.auth.controller.internal;

import com.novel.agent.auth.service.CryptoManifestService;
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

    @Value("${agent.internal-service-key:}")
    private String internalServiceKey;

    @PostMapping("/manifest")
    public void publish(
        @RequestHeader(value = "X-Internal-Service-Key", required = false) String key,
        @Valid @RequestBody PublishManifestRequest request
    ) {
        if (internalServiceKey == null || internalServiceKey.isBlank()
            || key == null || !internalServiceKey.equals(key)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
        }
        cryptoManifestService.publish(request.getManifest(), request.getTtlSec());
    }

    @Data
    public static class PublishManifestRequest {
        @NotNull
        private CryptoManifestService.CryptoManifestView manifest;
        private long ttlSec = 86400L * 2;
    }
}
