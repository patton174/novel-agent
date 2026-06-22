package cn.novelstudio.module.auth.config;

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
    /** 账户邮箱验证链接有效期（秒） */
    private int emailVerifyLinkTtlSeconds = 86_400;
    /** 密码重置链接有效期（秒） */
    private int passwordResetLinkTtlSeconds = 3600;
    /** 前端站点根 URL，用于拼接验证链接 */
    private String frontendBaseUrl = "https://novel-agent.cn";
    /** 邮箱验证链接 HMAC 密钥（环境变量 AUTH_EMAIL_LINK_SECRET） */
    private String emailLinkSecret = "";
    private int captchaChallengeTtlSeconds = 300;
    private int captchaTokenTtlSeconds = 600;
    private int captchaTolerancePx = 6;
    private int sliderWidth = 300;
    private int sliderHeight = 150;
    private int puzzleSize = 44;
}
