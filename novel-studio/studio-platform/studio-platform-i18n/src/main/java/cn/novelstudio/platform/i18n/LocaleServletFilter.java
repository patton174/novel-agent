package cn.novelstudio.platform.i18n;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** 解析 Accept-Language / X-App-Locale，写入 {@link LocaleContext}。 */
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class LocaleServletFilter extends OncePerRequestFilter {

    public static final String HEADER_APP_LOCALE = "X-App-Locale";

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        AppLocale locale = resolveLocale(request);
        LocaleContext.set(locale);
        LocaleContextHolder.setLocale(locale.locale());
        response.setHeader(HEADER_APP_LOCALE, locale.tag());
        try {
            filterChain.doFilter(request, response);
        } finally {
            LocaleContextHolder.resetLocaleContext();
            LocaleContext.clear();
        }
    }

    static AppLocale resolveLocale(HttpServletRequest request) {
        String explicit = request.getHeader(HEADER_APP_LOCALE);
        if (explicit != null && !explicit.isBlank()) {
            return AppLocale.fromTag(explicit);
        }
        return AppLocale.fromAcceptLanguage(request.getHeader("Accept-Language"));
    }
}
