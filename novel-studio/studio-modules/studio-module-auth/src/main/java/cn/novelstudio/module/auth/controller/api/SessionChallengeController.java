package cn.novelstudio.module.auth.controller.api;

import cn.novelstudio.module.auth.captcha.TurnstileVerificationService;
import cn.novelstudio.module.auth.dto.SessionChallengeVerifyRequest;
import cn.novelstudio.module.auth.security.JwtAuthService;
import cn.novelstudio.module.auth.support.ClientRequestSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.module.risk.service.RiskSessionHooks;
import cn.novelstudio.platform.web.BaseController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth/api/challenge")
@RequiredArgsConstructor
public class SessionChallengeController extends BaseController {

    private final JwtAuthService jwtAuthService;
    private final TurnstileVerificationService turnstileVerificationService;
    private final RiskSessionHooks riskSessionHooks;
    private final ClientRequestSupport clientRequestSupport;

    @PostMapping("/verify")
    public Result<Void> verifyChallenge(
        @RequestHeader(value = "Authorization", required = false) String authorization,
        @Valid @RequestBody SessionChallengeVerifyRequest body,
        HttpServletRequest request
    ) {
        var principal = jwtAuthService.parseAccessPrincipal(authorization);
        String ip = clientRequestSupport.clientIp(request);
        turnstileVerificationService.verifyRequired(body.getTurnstileToken(), ip);
        riskSessionHooks.afterChallengeVerified(principal.sessionId());
        return ok(null);
    }
}
