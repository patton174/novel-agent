package com.novel.agent.pyai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class PyaiWebClientConfig {

    @Bean
    WebClient contentWebClient(
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl
    ) {
        return WebClient.builder().baseUrl(contentBaseUrl).build();
    }

    @Bean
    RestClient contentRestClient(
        @Value("${agent.content.base-url:http://127.0.0.1:8091}") String contentBaseUrl
    ) {
        return RestClient.builder().baseUrl(contentBaseUrl).build();
    }
}
