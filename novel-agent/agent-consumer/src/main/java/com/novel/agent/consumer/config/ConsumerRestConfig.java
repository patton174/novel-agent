package com.novel.agent.consumer.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class ConsumerRestConfig {

    @Bean
    RestClient contentRestClient(
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl
    ) {
        return RestClient.builder().baseUrl(contentBaseUrl).build();
    }

    @Bean
    RestClient pythonRestClient(
        @Value("${agent.python.base-url:http://127.0.0.1:8000}") String pythonBaseUrl
    ) {
        return RestClient.builder().baseUrl(pythonBaseUrl).build();
    }
}
