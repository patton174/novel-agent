package cn.novelstudio.module.auth.service;

import cn.novelstudio.platform.mail.sender.MailtrapEmailSender;
import cn.novelstudio.module.auth.config.VerificationProperties;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.TooManyRequestsException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.platform.security.EmailVerifyLinkCodec;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

@Service
public class EmailVerificationService {

    private final StringRedisTemplate redisTemplate;
    private final VerificationProperties properties;
    private final MailtrapEmailSender mailtrapEmailSender;
    private final AuthUserRepository authUserRepository;
    private final HumanVerificationService humanVerificationService;
    private final RateLimitService rateLimitService;
    private final EmailLinkSecretService emailLinkSecretService;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(
        StringRedisTemplate redisTemplate,
        VerificationProperties properties,
        MailtrapEmailSender mailtrapEmailSender,
        AuthUserRepository authUserRepository,
        HumanVerificationService humanVerificationService,
        RateLimitService rateLimitService,
        EmailLinkSecretService emailLinkSecretService
    ) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.mailtrapEmailSender = mailtrapEmailSender;
        this.authUserRepository = authUserRepository;
        this.humanVerificationService = humanVerificationService;
        this.rateLimitService = rateLimitService;
        this.emailLinkSecretService = emailLinkSecretService;
    }

    public void sendRegisterCode(String email, String captchaToken, String ip, String fingerprint) {
        String normalized = normalizeEmail(email);
        if (authUserRepository.existsByEmail(normalized)) {
            throw BizException.of(ResultCode.AUTH_EMAIL_EXISTS);
        }
        assertSendEmailCodeAllowed(normalized, ip, fingerprint);

        String cooldownKey = SecurityRedisKeys.EMAIL_COOLDOWN_PREFIX + normalized;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            throw new TooManyRequestsException(ResultCode.EMAIL_SEND_TOO_FREQUENT, "发送过于频繁，请稍后再试");
        }

        humanVerificationService.consumeVerificationToken(captchaToken, normalized);

        String code = String.format("%06d", random.nextInt(1_000_000));
        mailtrapEmailSender.sendVerificationCode(normalized, code, properties.getEmailCodeTtlSeconds());
        recordSendEmailCodeSuccess(normalized, ip, fingerprint);
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

    public void sendAccountVerifyLink(Long userId) {
        AuthUser user = authUserRepository.findById(userId)
            .orElseThrow(() -> BizException.of(ResultCode.AUTH_USER_NOT_FOUND));
        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw BizException.of(ResultCode.EMAIL_ALREADY_VERIFIED);
        }
        String email = normalizeEmail(user.getEmail());
        if (email.isBlank()) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "账户未绑定邮箱");
        }

        assertSendEmailVerifyAllowed(userId, email);

        String cooldownKey = SecurityRedisKeys.EMAIL_COOLDOWN_PREFIX + "verify:" + userId;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            throw new TooManyRequestsException(ResultCode.EMAIL_SEND_TOO_FREQUENT, "发送过于频繁，请稍后再试");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        long expEpochSec = Instant.now().getEpochSecond() + properties.getEmailVerifyLinkTtlSeconds();
        String linkSecret = requireEmailLinkSecret();
        String sig = EmailVerifyLinkCodec.signBase64(token, userId, expEpochSec, linkSecret);

        String baseUrl = properties.getFrontendBaseUrl().replaceAll("/+$", "");
        String verifyUrl = baseUrl
            + "/verify-email?token=" + token
            + "&exp=" + expEpochSec
            + "&sig=" + sig;
        mailtrapEmailSender.sendVerificationLink(
            email,
            verifyUrl,
            properties.getEmailVerifyLinkTtlSeconds(),
            properties.getFrontendBaseUrl()
        );
        recordSendEmailVerifySuccess(userId, email);
        redisTemplate.opsForValue().set(
            SecurityRedisKeys.EMAIL_VERIFY_LINK_PREFIX + token,
            String.valueOf(userId),
            Duration.ofSeconds(properties.getEmailVerifyLinkTtlSeconds())
        );
        redisTemplate.opsForValue().set(
            cooldownKey,
            "1",
            Duration.ofSeconds(properties.getEmailCooldownSeconds())
        );
    }

    public void confirmAccountVerifyLink(String token, String sig, long expEpochSec) {
        if (token == null || token.isBlank()) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "验证链接无效");
        }
        if (sig == null || sig.isBlank()) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "验证链接签名无效");
        }
        if (expEpochSec <= 0 || Instant.now().getEpochSecond() > expEpochSec) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "验证链接已过期");
        }

        String key = SecurityRedisKeys.EMAIL_VERIFY_LINK_PREFIX + token.trim();
        String userIdRaw = redisTemplate.opsForValue().get(key);
        if (userIdRaw == null) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "验证链接无效或已过期");
        }
        Long userId = Long.parseLong(userIdRaw);
        if (!EmailVerifyLinkCodec.verify(token.trim(), userId, expEpochSec, requireEmailLinkSecret(), sig)) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "验证链接签名无效");
        }

        AuthUser user = authUserRepository.findById(userId)
            .orElseThrow(() -> BizException.of(ResultCode.AUTH_USER_NOT_FOUND));
        user.setEmailVerified(true);
        authUserRepository.save(user);
        redisTemplate.delete(key);
    }

    private String requireEmailLinkSecret() {
        return emailLinkSecretService.requireSecret();
    }

    private void assertSendEmailCodeAllowed(String email, String ip, String fingerprint) {
        rateLimitService.assertUnderLimit("send-email-code:ip", ip, 10, Duration.ofHours(1));
        if (fingerprint != null && !fingerprint.isBlank()) {
            rateLimitService.assertUnderLimit("send-email-code:fp", fingerprint, 10, Duration.ofHours(1));
        }
        rateLimitService.assertUnderLimit(
            "send-email-code:email",
            email,
            properties.getEmailDailyLimit(),
            Duration.ofDays(1)
        );
    }

    private void recordSendEmailCodeSuccess(String email, String ip, String fingerprint) {
        rateLimitService.recordSuccess("send-email-code:ip", ip, Duration.ofHours(1));
        if (fingerprint != null && !fingerprint.isBlank()) {
            rateLimitService.recordSuccess("send-email-code:fp", fingerprint, Duration.ofHours(1));
        }
        rateLimitService.recordSuccess("send-email-code:email", email, Duration.ofDays(1));
    }

    private void assertSendEmailVerifyAllowed(Long userId, String email) {
        rateLimitService.assertUnderLimit("send-email-verify:user", String.valueOf(userId), 5, Duration.ofHours(1));
        rateLimitService.assertUnderLimit(
            "send-email-verify:email",
            email,
            properties.getEmailDailyLimit(),
            Duration.ofDays(1)
        );
    }

    private void recordSendEmailVerifySuccess(Long userId, String email) {
        rateLimitService.recordSuccess("send-email-verify:user", String.valueOf(userId), Duration.ofHours(1));
        rateLimitService.recordSuccess("send-email-verify:email", email, Duration.ofDays(1));
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
