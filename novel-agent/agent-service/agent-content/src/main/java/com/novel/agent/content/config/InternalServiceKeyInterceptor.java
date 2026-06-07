package com.novel.agent.content.config;

import com.novel.agent.common.service.internal.InternalServiceGuard;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class InternalServiceKeyInterceptor implements HandlerInterceptor {

    public static final String HEADER = "X-Internal-Service-Key";

    private final InternalServiceGuard internalServiceGuard;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        internalServiceGuard.requireValidKey(request.getHeader(HEADER));
        return true;
    }
}
