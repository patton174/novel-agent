package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.captcha.CaptchaTokenBinding;
import cn.novelstudio.module.auth.captcha.TurnstileVerificationService;
import cn.novelstudio.module.auth.config.VerificationProperties;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
public class HumanVerificationService {

    private final StringRedisTemplate redisTemplate;
    private final VerificationProperties properties;
    private final TurnstileVerificationService turnstileVerificationService;

    public HumanVerificationService(
        StringRedisTemplate redisTemplate,
        VerificationProperties properties,
        TurnstileVerificationService turnstileVerificationService
    ) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.turnstileVerificationService = turnstileVerificationService;
    }

    public String verifyTurnstileAndIssueToken(String email, String turnstileToken, String honeypot, String remoteIp) {
        assertHoneypotBlank(honeypot);
        turnstileVerificationService.verifyRequired(turnstileToken, remoteIp);

        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "邮箱不能为空");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        redisTemplate.opsForValue().set(
            SecurityRedisKeys.CAPTCHA_TOKEN_PREFIX + token,
            CaptchaTokenBinding.hashEmail(normalizedEmail),
            Duration.ofSeconds(properties.getCaptchaTokenTtlSeconds())
        );
        return token;
    }

    public void consumeVerificationToken(String token, String email) {
        if (token == null || token.isBlank()) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "请先完成人机验证");
        }
        String normalizedEmail = normalizeEmail(email);
        String key = SecurityRedisKeys.CAPTCHA_TOKEN_PREFIX + token;
        String bound = redisTemplate.opsForValue().getAndDelete(key);
        if (bound == null) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "人机验证已失效，请重新验证");
        }
        if (!bound.equals(CaptchaTokenBinding.hashEmail(normalizedEmail))) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "人机验证与当前邮箱不匹配，请重新验证");
        }
    }

    private static void assertHoneypotBlank(String honeypot) {
        if (honeypot != null && !honeypot.isBlank()) {
            throw new ValidationException(ResultCode.CAPTCHA_INVALID, "验证失败");
        }
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
