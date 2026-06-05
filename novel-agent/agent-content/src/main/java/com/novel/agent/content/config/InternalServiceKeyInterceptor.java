package com.novel.agent.content.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class InternalServiceKeyInterceptor implements HandlerInterceptor {

    public static final String HEADER = "X-Internal-Service-Key";

    private final AgentRuntimeProperties runtimeProperties;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String provided = request.getHeader(HEADER);
        String expected = runtimeProperties.internalServiceKey();
        if (expected == null || expected.isBlank()) {
            response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
            return false;
        }
        if (provided == null || !expected.equals(provided)) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return false;
        }
        return true;
    }
}
