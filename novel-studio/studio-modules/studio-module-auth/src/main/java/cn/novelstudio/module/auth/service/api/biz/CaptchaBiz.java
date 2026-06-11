package cn.novelstudio.module.auth.service.api.biz;

import cn.novelstudio.module.auth.dto.CaptchaTokenResponse;
import cn.novelstudio.module.auth.dto.SliderCaptchaChallengeResponse;
import cn.novelstudio.module.auth.service.RateLimitService;
import cn.novelstudio.module.auth.service.SliderCaptchaService;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
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
