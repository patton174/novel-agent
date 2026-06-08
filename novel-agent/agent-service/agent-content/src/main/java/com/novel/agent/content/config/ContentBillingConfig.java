package com.novel.agent.content.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class ContentBillingConfig {

    @Bean
    RestClient billingRestClient(
        @Value("${agent.billing.base-url:http://127.0.0.1:8092}") String billingBaseUrl
    ) {
        return RestClient.builder().baseUrl(billingBaseUrl).build();
    }
}
