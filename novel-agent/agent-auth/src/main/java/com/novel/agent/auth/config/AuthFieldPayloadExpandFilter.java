package com.novel.agent.auth.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.auth.service.FrontendCryptoRegisterService;
import com.novel.agent.common.security.AesGcmCodec;
import com.novel.agent.common.security.FieldSecurePayload;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Gateway 未展开 {@code __sec} 字段加密体时的兜底（如 gateway field-encryption 与前端不一致）。
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
public class AuthFieldPayloadExpandFilter extends OncePerRequestFilter {

    private static final Set<String> EXPAND_PREFIXES = Set.of(
        "/api/auth/api/",
        "/internal/"
    );

    private final FrontendCryptoRegisterService frontendCryptoRegisterService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        if (!shouldExpand(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        byte[] body = request.getInputStream().readAllBytes();
        HttpServletRequest wrapped = new AuthCachedBodyHttpServletRequest(request, body);
        if (body.length == 0 || !FieldSecurePayload.looksSecure(objectMapper, body)) {
            filterChain.doFilter(wrapped, response);
            return;
        }

        var runtime = frontendCryptoRegisterService.currentRuntime();
        if (runtime.isEmpty()) {
            log.warn("field payload expand skipped: bootstrap runtime missing path={}", request.getRequestURI());
            filterChain.doFilter(wrapped, response);
            return;
        }

        try {
            AesGcmCodec codec = AesGcmCodec.fromBase64Key(runtime.get().aesKeyB64());
            byte[] expanded = FieldSecurePayload.expand(objectMapper, body, codec);
            filterChain.doFilter(new AuthCachedBodyHttpServletRequest(request, expanded), response);
        } catch (Exception ex) {
            log.warn("field payload expand failed path={}: {}", request.getRequestURI(), ex.getMessage());
            filterChain.doFilter(wrapped, response);
        }
    }

    private static boolean shouldExpand(HttpServletRequest request) {
        String method = request.getMethod();
        if (!HttpMethod.POST.matches(method) && !HttpMethod.PUT.matches(method) && !HttpMethod.PATCH.matches(method)) {
            return false;
        }
        String path = request.getRequestURI();
        for (String prefix : EXPAND_PREFIXES) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
}
