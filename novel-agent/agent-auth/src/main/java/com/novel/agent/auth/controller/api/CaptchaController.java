package com.novel.agent.auth.controller.api;

import com.novel.agent.auth.dto.CaptchaTokenResponse;
import com.novel.agent.auth.dto.SliderCaptchaChallengeResponse;
import com.novel.agent.auth.dto.SliderCaptchaVerifyRequest;
import com.novel.agent.auth.service.api.biz.CaptchaBiz;
import com.novel.agent.auth.support.ClientRequestSupport;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.service.BaseController;
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
