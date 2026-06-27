package cn.novelstudio.module.auth.service.api.biz;

import cn.novelstudio.module.auth.dto.LoginRequest;
import cn.novelstudio.module.auth.dto.RegisterRequest;
import cn.novelstudio.module.auth.security.JwtAuthService;
import cn.novelstudio.module.auth.service.AuthService;
import cn.novelstudio.module.auth.service.RateLimitService;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.kernel.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AuthPublicBiz extends BaseBiz {

    private final AuthService authService;
    private final RateLimitService rateLimitService;

    public JwtAuthService.AuthSessionBundle login(
        LoginRequest request,
        String ip,
        String fingerprint,
        String clientCountry
    ) {
        rateLimitService.checkComposite("login", ip, fingerprint, 20, Duration.ofMinutes(15));
        return authService.login(request, ip, clientCountry);
    }

    public Result<Void> register(RegisterRequest request, String ip, String fingerprint, String referralCode) {
        authService.register(request, ip, fingerprint, referralCode);
        return ok(null);
    }

    public JwtAuthService.AuthSessionBundle refresh(
        String refreshToken,
        String fingerprint,
        String clientIp,
        String clientCountry
    ) {
        return authService.refresh(refreshToken, fingerprint, null, clientIp, clientCountry);
    }

    public Result<Void> logout(String refreshToken) {
        authService.logout(refreshToken);
        return ok(null);
    }
}
