package cn.novelstudio.module.auth.controller.api;

import cn.novelstudio.module.auth.dto.LoginRequest;
import cn.novelstudio.module.auth.dto.LoginResponse;
import cn.novelstudio.module.auth.dto.RegisterRequest;
import cn.novelstudio.module.auth.security.JwtAuthService;
import cn.novelstudio.module.auth.service.api.biz.AuthPublicBiz;
import cn.novelstudio.module.auth.service.impl.AuthServiceImpl;
import cn.novelstudio.module.auth.support.ClientRequestSupport;
import cn.novelstudio.kernel.base.Result;
import cn.novelstudio.platform.security.SecurityCookieNames;
import cn.novelstudio.platform.web.BaseController;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;

@Slf4j
@RestController
@RequestMapping("/api/auth/api")
@RequiredArgsConstructor
public class AuthPublicController extends BaseController {

    private final AuthPublicBiz biz;
    private final JwtAuthService jwtAuthService;
    private final ClientRequestSupport clientRequestSupport;

    @PostMapping("/login")
    public ResponseEntity<Result<LoginResponse>> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        log.info("登录请求: username={}", request.getUsername());
        String ip = clientRequestSupport.clientIp(httpRequest);
        String fingerprint = request.getFingerprint() != null
            ? request.getFingerprint()
            : clientRequestSupport.fingerprint(httpRequest);
        JwtAuthService.AuthSessionBundle bundle = biz.login(request, ip, fingerprint);
        return withAuthCookies(ok(AuthServiceImpl.toResponse(bundle)), bundle);
    }

    @PostMapping("/register")
    public Result<Void> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        log.info("注册请求: username={}", request.getUsername());
        return biz.register(
            request,
            clientRequestSupport.clientIp(httpRequest),
            clientRequestSupport.fingerprint(httpRequest)
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<Result<LoginResponse>> refresh(HttpServletRequest request) {
        JwtAuthService.AuthSessionBundle bundle = biz.refresh(readCookie(request, SecurityCookieNames.REFRESH));
        return withAuthCookies(ok(AuthServiceImpl.toResponse(bundle)), bundle);
    }

    @PostMapping("/logout")
    public ResponseEntity<Result<Void>> logout(HttpServletRequest request) {
        Result<Void> body = biz.logout(readCookie(request, SecurityCookieNames.REFRESH));
        return ResponseEntity.ok()
            .headers(headers -> jwtAuthService.clearAuthCookies().forEach(c -> headers.add(HttpHeaders.SET_COOKIE, c.toString())))
            .body(body);
    }

    private ResponseEntity<Result<LoginResponse>> withAuthCookies(
        Result<LoginResponse> body,
        JwtAuthService.AuthSessionBundle bundle
    ) {
        return ResponseEntity.ok()
            .headers(headers -> jwtAuthService.buildAuthCookies(bundle).forEach(c -> headers.add(HttpHeaders.SET_COOKIE, c.toString())))
            .body(body);
    }

    private static String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        return Arrays.stream(cookies)
            .filter(c -> name.equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }
}
