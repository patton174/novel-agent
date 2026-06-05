package com.novel.agent.auth.service;

import com.novel.agent.auth.config.VerificationProperties;
import com.novel.agent.auth.repository.AuthUserRepository;
import com.novel.agent.common.core.enums.ResultCode;
import com.novel.agent.common.core.exception.BizException;
import com.novel.agent.common.core.exception.TooManyRequestsException;
import com.novel.agent.common.core.exception.ValidationException;
import com.novel.agent.common.security.SecurityRedisKeys;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Locale;

@Service
public class EmailVerificationService {

    private final StringRedisTemplate redisTemplate;
    private final VerificationProperties properties;
    private final MailtrapEmailSender mailtrapEmailSender;
    private final AuthUserRepository authUserRepository;
    private final SliderCaptchaService sliderCaptchaService;
    private final RateLimitService rateLimitService;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(
        StringRedisTemplate redisTemplate,
        VerificationProperties properties,
        MailtrapEmailSender mailtrapEmailSender,
        AuthUserRepository authUserRepository,
        SliderCaptchaService sliderCaptchaService,
        RateLimitService rateLimitService
    ) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.mailtrapEmailSender = mailtrapEmailSender;
        this.authUserRepository = authUserRepository;
        this.sliderCaptchaService = sliderCaptchaService;
        this.rateLimitService = rateLimitService;
    }

    public void sendRegisterCode(String email, String captchaToken, String ip, String fingerprint) {
        String normalized = normalizeEmail(email);
        if (authUserRepository.existsByEmail(normalized)) {
            throw BizException.of(ResultCode.AUTH_EMAIL_EXISTS);
        }
        sliderCaptchaService.consumeCaptchaToken(captchaToken);

        rateLimitService.checkComposite("send-email-code", ip, fingerprint, 10, Duration.ofHours(1));
        rateLimitService.check("send-email-code:email", normalized, properties.getEmailDailyLimit(), Duration.ofDays(1));

        String cooldownKey = SecurityRedisKeys.EMAIL_COOLDOWN_PREFIX + normalized;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            throw new TooManyRequestsException(ResultCode.EMAIL_SEND_TOO_FREQUENT, "发送过于频繁，请稍后再试");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        redisTemplate.opsForValue().set(
            SecurityRedisKeys.EMAIL_CODE_PREFIX + normalized,
            code,
            Duration.ofSeconds(properties.getEmailCodeTtlSeconds())
        );
        redisTemplate.opsForValue().set(
            cooldownKey,
            "1",
            Duration.ofSeconds(properties.getEmailCooldownSeconds())
        );
        incrementDailyCounter(normalized);
        mailtrapEmailSender.sendVerificationCode(normalized, code);
    }

    public void verifyRegisterCode(String email, String code) {
        String normalized = normalizeEmail(email);
        if (code == null || !code.matches("\\d{6}")) {
            throw new ValidationException(ResultCode.EMAIL_CODE_INVALID, "验证码格式不正确");
        }
        String key = SecurityRedisKeys.EMAIL_CODE_PREFIX + normalized;
        String expected = redisTemplate.opsForValue().get(key);
        if (expected == null) {
            throw new ValidationException(ResultCode.EMAIL_CODE_INVALID, "验证码已过期，请重新获取");
        }
        rateLimitService.check("verify-email-code:" + normalized, normalized, 8, Duration.ofMinutes(10));
        if (!expected.equals(code.trim())) {
            throw new ValidationException(ResultCode.EMAIL_CODE_INVALID, "验证码错误");
        }
        redisTemplate.delete(key);
    }

    private void incrementDailyCounter(String email) {
        String dayKey = SecurityRedisKeys.EMAIL_DAILY_PREFIX + LocalDate.now() + ":" + email;
        Long count = redisTemplate.opsForValue().increment(dayKey);
        if (count != null && count == 1L) {
            redisTemplate.expire(dayKey, Duration.ofDays(1));
        }
        if (count != null && count > properties.getEmailDailyLimit()) {
            throw new TooManyRequestsException(ResultCode.EMAIL_SEND_TOO_FREQUENT, "该邮箱今日发送次数已达上限");
        }
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
