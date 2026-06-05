package com.novel.agent.auth.controller;

import com.novel.agent.auth.service.CryptoManifestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class CryptoManifestController {

    @Autowired
    private CryptoManifestService cryptoManifestService;

    @GetMapping("/crypto-manifest")
    public ResponseEntity<CryptoManifestService.CryptoManifestView> manifest() {
        return cryptoManifestService.current()
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
