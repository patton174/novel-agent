package com.novel.agent.content.config;

import feign.RequestInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class FeignInternalClientConfig {

    private final AgentRuntimeProperties runtimeProperties;

    @Bean
    public RequestInterceptor feignInternalServiceKeyInterceptor() {
        return template -> {
            String internalServiceKey = runtimeProperties.internalServiceKey();
            if (internalServiceKey != null && !internalServiceKey.isBlank()) {
                template.header(InternalServiceKeyInterceptor.HEADER, internalServiceKey);
            }
        };
    }
}
