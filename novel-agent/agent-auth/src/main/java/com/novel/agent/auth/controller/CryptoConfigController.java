package com.novel.agent.auth.controller;

import com.novel.agent.auth.service.FrontendCryptoRegisterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class CryptoConfigController {

    @Autowired
    private FrontendCryptoRegisterService frontendCryptoRegisterService;

    /** 浏览器热更新兜底：与 Worker 上 crypto-runtime.json 内容一致 */
    @GetMapping("/crypto-config")
    public ResponseEntity<FrontendCryptoRegisterService.CryptoRuntimeView> config() {
        return frontendCryptoRegisterService.currentRuntime()
            .map(runtime -> ResponseEntity.ok()
                .header("X-Crypto-Key-Version", String.valueOf(runtime.version()))
                .body(runtime))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
