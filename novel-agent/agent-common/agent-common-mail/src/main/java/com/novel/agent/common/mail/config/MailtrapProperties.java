package com.novel.agent.common.mail.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "mailtrap")
public class MailtrapProperties {

    /** Mailtrap API token，仅环境变量注入，禁止硬编码 */
    private String token = "";

    private String fromEmail = "hello@noreply.novel-agent.cn";

    private String fromName = "Novel Agent";

    public boolean enabled() {
        return token != null && !token.isBlank();
    }
}
