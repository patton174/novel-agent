package com.novel.agent.auth.controller.api;

import com.novel.agent.auth.service.FrontendCryptoRegisterService;
import com.novel.agent.auth.service.api.biz.CryptoConfigBiz;
import com.novel.agent.common.service.BaseController;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class CryptoConfigController extends BaseController {

    private final CryptoConfigBiz biz;

    /** 浏览器热更新兜底：与 Worker 上 crypto-runtime.json 内容一致 */
    @GetMapping("/crypto-config")
    public ResponseEntity<FrontendCryptoRegisterService.CryptoRuntimeView> config() {
        return biz.currentRuntime()
            .map(runtime -> ResponseEntity.ok()
                .header("X-Crypto-Key-Version", String.valueOf(runtime.version()))
                .body(runtime))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
