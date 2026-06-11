package cn.novelstudio.platform.web.observability;

import cn.novelstudio.kernel.observability.TraceIds;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class TraceIdServletFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String traceId = TraceIds.resolveOrNew(request.getHeader(TraceIds.HEADER));
        MDC.put(TraceIds.MDC_KEY, traceId);
        response.setHeader(TraceIds.HEADER, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(TraceIds.MDC_KEY);
        }
    }
}
