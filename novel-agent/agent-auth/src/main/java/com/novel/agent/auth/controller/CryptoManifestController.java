package com.novel.agent.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 路由映射表不再对浏览器公开；路径加密见 Worker crypto-runtime.json */
@RestController
@RequestMapping("/api/auth")
public class CryptoManifestController {

    @GetMapping("/crypto-manifest")
    public ResponseEntity<Void> manifest() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}
