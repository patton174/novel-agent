package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.AuthUnauthorizedException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 50)
@RequiredArgsConstructor
public class ClientAuthServletFilter extends OncePerRequestFilter {

    private final ClientAuthSupport clientAuthSupport;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (clientAuthSupport.isWhitePath(path)) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            var principal = clientAuthSupport.resolvePrincipal(request);
            filterChain.doFilter(clientAuthSupport.injectUserHeaders(request, principal), response);
        } catch (AuthUnauthorizedException ex) {
            ClientSecurityResponses.unauthorized(response, ex.getMessage());
        } catch (NumberFormatException ex) {
            ClientSecurityResponses.unauthorized(response, "登录已过期，请重新登录");
        }
    }
}
