package com.novel.agent.common.image.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.image.PythonImageClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnClass(PythonImageClient.class)
@EnableConfigurationProperties(ImageClientProperties.class)
public class ImageAutoConfiguration {

    @Bean
    public PythonImageClient pythonImageClient(
        @Value("${agent.python.base-url:http://127.0.0.1:8000}") String pythonBaseUrl,
        ImageClientProperties properties,
        ObjectMapper objectMapper
    ) {
        return new PythonImageClient(pythonBaseUrl, properties, objectMapper);
    }
}
