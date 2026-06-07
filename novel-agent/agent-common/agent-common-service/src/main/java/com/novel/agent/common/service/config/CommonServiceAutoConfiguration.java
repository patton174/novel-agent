package com.novel.agent.common.service.config;

import com.novel.agent.common.service.HandlerException;
import com.novel.agent.common.service.internal.InternalServiceGuard;
import com.novel.agent.common.service.observability.TraceIdServletFilter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

@AutoConfiguration
@Import({HandlerException.class, InternalServiceGuard.class})
public class CommonServiceAutoConfiguration {

    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    public TraceIdServletFilter traceIdServletFilter() {
        return new TraceIdServletFilter();
    }
}
