package cn.novelstudio.module.auth.controller.api;

import cn.novelstudio.module.auth.service.FrontendCryptoRegisterService;
import cn.novelstudio.module.auth.service.api.biz.CryptoConfigBiz;
import cn.novelstudio.platform.web.BaseController;
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

    /** 浏览器 bootstrap：Worker 注册后由 novel-studio 从 Redis 下发（无静态文件） */
    @GetMapping("/crypto-config")
    public ResponseEntity<FrontendCryptoRegisterService.CryptoRuntimeView> config() {
        return biz.currentRuntime()
            .map(runtime -> ResponseEntity.ok()
                .header("X-Crypto-Key-Version", String.valueOf(runtime.version()))
                .body(runtime))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
