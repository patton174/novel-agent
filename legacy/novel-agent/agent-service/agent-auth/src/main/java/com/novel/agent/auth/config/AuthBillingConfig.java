package com.novel.agent.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class AuthBillingConfig {

    @Bean
    RestClient billingRestClient(AuthIntegrationProperties properties) {
        return RestClient.builder()
            .baseUrl(properties.getBilling().getBaseUrl())
            .build();
    }
}
