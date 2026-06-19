package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.config.VerificationProperties;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.kernel.enums.ResultCode;
import cn.novelstudio.kernel.exception.BizException;
import cn.novelstudio.kernel.exception.TooManyRequestsException;
import cn.novelstudio.kernel.exception.ValidationException;
import cn.novelstudio.platform.mail.sender.MailtrapEmailSender;
import cn.novelstudio.platform.security.EmailVerifyLinkCodec;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private final StringRedisTemplate redisTemplate;
    private final VerificationProperties properties;
    private final MailtrapEmailSender mailtrapEmailSender;
    private final AuthUserRepository authUserRepository;
    private final RateLimitService rateLimitService;
    private final EmailLinkSecretService emailLinkSecretService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    public PasswordResetService(
        StringRedisTemplate redisTemplate,
        VerificationProperties properties,
        MailtrapEmailSender mailtrapEmailSender,
        AuthUserRepository authUserRepository,
        RateLimitService rateLimitService,
        EmailLinkSecretService emailLinkSecretService
    ) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
        this.mailtrapEmailSender = mailtrapEmailSender;
        this.authUserRepository = authUserRepository;
        this.rateLimitService = rateLimitService;
        this.emailLinkSecretService = emailLinkSecretService;
    }

    /** 无论邮箱是否存在均静默成功，避免用户枚举 */
    public void requestPasswordReset(String email) {
        String normalized = normalizeEmail(email);
        if (normalized.isBlank()) {
            return;
        }
        authUserRepository.findByEmail(normalized).ifPresent(user -> sendResetLink(user, normalized));
    }

    public void confirmPasswordReset(String token, String sig, long expEpochSec, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new ValidationException(ResultCode.BAD_REQUEST, "密码至少 6 位");
        }
        if (token == null || token.isBlank()) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "重置链接无效");
        }
        if (sig == null || sig.isBlank()) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "重置链接签名无效");
        }
        if (expEpochSec <= 0 || Instant.now().getEpochSecond() > expEpochSec) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "重置链接已过期");
        }

        String key = SecurityRedisKeys.PASSWORD_RESET_LINK_PREFIX + token.trim();
        String userIdRaw = redisTemplate.opsForValue().get(key);
        if (userIdRaw == null) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "重置链接无效或已过期");
        }
        Long userId = Long.parseLong(userIdRaw);
        if (!EmailVerifyLinkCodec.verify(token.trim(), userId, expEpochSec, requireEmailLinkSecret(), sig)) {
            throw new ValidationException(ResultCode.EMAIL_VERIFY_LINK_INVALID, "重置链接签名无效");
        }

        AuthUser user = authUserRepository.findById(userId)
            .orElseThrow(() -> BizException.of(ResultCode.AUTH_USER_NOT_FOUND));
        user.setPassword(passwordEncoder.encode(newPassword));
        authUserRepository.save(user);
        redisTemplate.delete(key);
    }

    private void sendResetLink(AuthUser user, String email) {
        Long userId = user.getId();
        rateLimitService.assertUnderLimit("forgot-password:email", email, 5, Duration.ofHours(1));
        rateLimitService.assertUnderLimit("forgot-password:user", String.valueOf(userId), 5, Duration.ofHours(1));

        String cooldownKey = SecurityRedisKeys.EMAIL_COOLDOWN_PREFIX + "reset:" + userId;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            throw new TooManyRequestsException(ResultCode.EMAIL_SEND_TOO_FREQUENT, "发送过于频繁，请稍后再试");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        long ttl = properties.getPasswordResetLinkTtlSeconds();
        long expEpochSec = Instant.now().getEpochSecond() + ttl;
        String linkSecret = requireEmailLinkSecret();
        String sig = EmailVerifyLinkCodec.signBase64(token, userId, expEpochSec, linkSecret);

        String baseUrl = properties.getFrontendBaseUrl().replaceAll("/+$", "");
        String resetUrl = baseUrl
            + "/reset-password?token=" + token
            + "&exp=" + expEpochSec
            + "&sig=" + sig;

        redisTemplate.opsForValue().set(
            SecurityRedisKeys.PASSWORD_RESET_LINK_PREFIX + token,
            String.valueOf(userId),
            Duration.ofSeconds(ttl)
        );
        redisTemplate.opsForValue().set(
            cooldownKey,
            "1",
            Duration.ofSeconds(properties.getEmailCooldownSeconds())
        );
        rateLimitService.recordSuccess("forgot-password:email", email, Duration.ofHours(1));
        rateLimitService.recordSuccess("forgot-password:user", String.valueOf(userId), Duration.ofHours(1));
        CompletableFuture.runAsync(() -> sendResetLinkEmail(email, resetUrl, ttl));
    }

    private void sendResetLinkEmail(String email, String resetUrl, long ttl) {
        try {
            mailtrapEmailSender.sendPasswordResetLink(email, resetUrl, ttl, properties.getFrontendBaseUrl());
        } catch (Exception ex) {
            log.warn("password reset mail send failed email={}: {}", maskEmail(email), ex.getMessage());
        }
    }

    private String requireEmailLinkSecret() {
        return emailLinkSecretService.requireSecret();
    }

    private static String maskEmail(String email) {
        int at = email == null ? -1 : email.indexOf('@');
        if (at <= 1) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }

    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
