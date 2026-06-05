package com.novel.agent.auth.service.api.biz;

import com.novel.agent.auth.dto.LoginRequest;
import com.novel.agent.auth.dto.RegisterRequest;
import com.novel.agent.auth.security.JwtAuthService;
import com.novel.agent.auth.service.AuthService;
import com.novel.agent.auth.service.RateLimitService;
import com.novel.agent.common.core.base.Result;
import com.novel.agent.common.core.biz.BaseBiz;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AuthPublicBiz extends BaseBiz {

    private final AuthService authService;
    private final RateLimitService rateLimitService;

    public JwtAuthService.AuthSessionBundle login(LoginRequest request, String ip, String fingerprint) {
        rateLimitService.checkComposite("login", ip, fingerprint, 20, Duration.ofMinutes(15));
        return authService.login(request);
    }

    public Result<Void> register(RegisterRequest request, String ip, String fingerprint) {
        authService.register(request, ip, fingerprint);
        return ok(null);
    }

    public JwtAuthService.AuthSessionBundle refresh(String refreshToken) {
        return authService.refresh(refreshToken);
    }

    public Result<Void> logout(String refreshToken) {
        authService.logout(refreshToken);
        return ok(null);
    }
}
