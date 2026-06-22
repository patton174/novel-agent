package cn.novelstudio.module.auth.service.api.biz;

import cn.novelstudio.module.auth.captcha.TurnstileVerificationService;
import cn.novelstudio.module.auth.dto.CaptchaPublicConfigResponse;
import cn.novelstudio.module.auth.dto.CaptchaTokenResponse;
import cn.novelstudio.module.auth.dto.TurnstileVerifyRequest;
import cn.novelstudio.module.auth.service.HumanVerificationService;
import cn.novelstudio.module.auth.service.RateLimitService;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class CaptchaBiz extends BaseBiz {

    private final HumanVerificationService humanVerificationService;
    private final RateLimitService rateLimitService;
    private final TurnstileVerificationService turnstileVerificationService;

    public Result<CaptchaPublicConfigResponse> getPublicConfig() {
        boolean enabled = turnstileVerificationService.isEnabled();
        return ok(CaptchaPublicConfigResponse.builder()
            .turnstileEnabled(enabled)
            .turnstileSiteKey(turnstileVerificationService.publicSiteKey())
            .build());
    }

    public Result<CaptchaTokenResponse> verifyTurnstile(TurnstileVerifyRequest body, String ip, String fingerprint) {
        rateLimitService.checkComposite("captcha-verify", ip, fingerprint, 20, Duration.ofMinutes(10));
        String token = humanVerificationService.verifyTurnstileAndIssueToken(
            body.getEmail(),
            body.getTurnstileToken(),
            body.getWebsite(),
            ip
        );
        return ok(CaptchaTokenResponse.builder().captchaToken(token).build());
    }
}
