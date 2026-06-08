package com.novel.agent.auth.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "agent")
public class AuthIntegrationProperties {

    private Internal internal = new Internal();
    private Billing billing = new Billing();

    @Data
    public static class Internal {
        private String serviceKey = "dev-internal-key-change-me";
    }

    @Data
    public static class Billing {
        private String baseUrl = "http://127.0.0.1:8092";
        private boolean enabled = true;
    }
}
