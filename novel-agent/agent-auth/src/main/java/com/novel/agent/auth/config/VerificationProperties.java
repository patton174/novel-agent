package com.novel.agent.auth.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "auth.verification")
public class VerificationProperties {

    private int emailCodeTtlSeconds = 600;
    private int emailCooldownSeconds = 60;
    private int emailDailyLimit = 5;
    private int captchaChallengeTtlSeconds = 300;
    private int captchaTokenTtlSeconds = 600;
    private int captchaTolerancePx = 6;
    private int sliderWidth = 300;
    private int sliderHeight = 150;
    private int puzzleSize = 44;
}
