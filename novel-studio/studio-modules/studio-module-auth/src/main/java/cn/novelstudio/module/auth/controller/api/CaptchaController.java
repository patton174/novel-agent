package cn.novelstudio.module.auth.controller.api;

import cn.novelstudio.module.auth.dto.CaptchaPublicConfigResponse;
import cn.novelstudio.module.auth.dto.CaptchaTokenResponse;
import cn.novelstudio.module.auth.dto.TurnstileVerifyRequest;
import cn.novelstudio.module.auth.service.api.biz.CaptchaBiz;
import cn.novelstudio.module.auth.support.ClientRequestSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/api/captcha")
@RequiredArgsConstructor
public class CaptchaController extends BaseController {

    private final CaptchaBiz biz;
    private final ClientRequestSupport clientRequestSupport;

    @GetMapping("/config")
    public Result<CaptchaPublicConfigResponse> getCaptchaPublicConfig() {
        return biz.getPublicConfig();
    }

    @PostMapping("/turnstile/verify")
    public Result<CaptchaTokenResponse> verifyTurnstile(
        @Valid @RequestBody TurnstileVerifyRequest body,
        HttpServletRequest request
    ) {
        String ip = clientRequestSupport.clientIp(request);
        String fingerprint = clientRequestSupport.fingerprint(request);
        return biz.verifyTurnstile(body, ip, fingerprint);
    }
}
