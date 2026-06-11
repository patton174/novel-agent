package cn.novelstudio.module.auth.controller.api;

import cn.novelstudio.module.auth.dto.CaptchaTokenResponse;
import cn.novelstudio.module.auth.dto.SliderCaptchaChallengeResponse;
import cn.novelstudio.module.auth.dto.SliderCaptchaVerifyRequest;
import cn.novelstudio.module.auth.service.api.biz.CaptchaBiz;
import cn.novelstudio.module.auth.support.ClientRequestSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.web.BaseController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    @PostMapping("/slider")
    public Result<SliderCaptchaChallengeResponse> createSliderCaptcha(HttpServletRequest request) {
        String ip = clientRequestSupport.clientIp(request);
        String fingerprint = clientRequestSupport.fingerprint(request);
        return biz.createSlider(ip, fingerprint);
    }

    @PostMapping("/slider/verify")
    public Result<CaptchaTokenResponse> verifySliderCaptcha(
        @Valid @RequestBody SliderCaptchaVerifyRequest body,
        HttpServletRequest request
    ) {
        String ip = clientRequestSupport.clientIp(request);
        String fingerprint = clientRequestSupport.fingerprint(request);
        return biz.verifySlider(body.getCaptchaId(), body.getOffsetX(), ip, fingerprint);
    }
}
