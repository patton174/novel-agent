package com.novel.agent.auth.service.api.biz;

import com.novel.agent.auth.dto.CaptchaTokenResponse;
import com.novel.agent.auth.dto.SliderCaptchaChallengeResponse;
import com.novel.agent.auth.service.RateLimitService;
import com.novel.agent.auth.service.SliderCaptchaService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class CaptchaBiz extends BaseBiz {

    private final SliderCaptchaService sliderCaptchaService;
    private final RateLimitService rateLimitService;

    public Result<SliderCaptchaChallengeResponse> createSlider(String ip, String fingerprint) {
        rateLimitService.checkComposite("captcha-create", ip, fingerprint, 30, Duration.ofMinutes(10));
        return ok(sliderCaptchaService.createChallenge());
    }

    public Result<CaptchaTokenResponse> verifySlider(String captchaId, int offsetX, String ip, String fingerprint) {
        rateLimitService.checkComposite("captcha-verify", ip, fingerprint, 20, Duration.ofMinutes(10));
        String token = sliderCaptchaService.verifyAndIssueToken(captchaId, offsetX);
        return ok(CaptchaTokenResponse.builder().captchaToken(token).build());
    }
}
