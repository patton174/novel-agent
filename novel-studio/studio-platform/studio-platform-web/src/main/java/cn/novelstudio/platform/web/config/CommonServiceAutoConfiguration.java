package cn.novelstudio.platform.web.config;

import cn.novelstudio.platform.web.HandlerException;
import cn.novelstudio.platform.web.internal.InternalServiceGuard;
import cn.novelstudio.platform.web.observability.TraceIdServletFilter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@Import({HandlerException.class, InternalServiceGuard.class, InternalApiWebConfig.class})
public class CommonServiceAutoConfiguration {

    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    public TraceIdServletFilter traceIdServletFilter() {
        return new TraceIdServletFilter();
    }
}
