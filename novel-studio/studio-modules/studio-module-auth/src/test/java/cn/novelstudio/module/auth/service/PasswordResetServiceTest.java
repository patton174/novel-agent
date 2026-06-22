package cn.novelstudio.module.auth.service;

import cn.novelstudio.module.auth.config.VerificationProperties;
import cn.novelstudio.module.auth.entity.AuthUser;
import cn.novelstudio.module.auth.repository.AuthUserRepository;
import cn.novelstudio.platform.mail.sender.MailtrapEmailSender;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PasswordResetServiceTest {

    @Test
    void requestPasswordResetReturnsWithoutWaitingForMailProvider() throws InterruptedException {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.hasKey(any(String.class))).thenReturn(false);
        when(valueOperations.get(any(String.class))).thenReturn(null);

        VerificationProperties properties = new VerificationProperties();
        properties.setEmailLinkSecret("test-email-link-secret-at-least-32-bytes");
        properties.setFrontendBaseUrl("https://www.novel-agent.cn");
        properties.setPasswordResetLinkTtlSeconds(3600);
        properties.setEmailCooldownSeconds(60);

        AuthUser user = new AuthUser();
        user.setId(42L);
        user.setEmail("writer@example.com");
        AuthUserRepository authUserRepository = mock(AuthUserRepository.class);
        when(authUserRepository.findByEmail("writer@example.com")).thenReturn(Optional.of(user));

        MailtrapEmailSender mailtrapEmailSender = mock(MailtrapEmailSender.class);
        CountDownLatch mailStarted = new CountDownLatch(1);
        doAnswer(invocation -> {
            mailStarted.countDown();
            Thread.sleep(5_000L);
            return null;
        }).when(mailtrapEmailSender).sendPasswordResetLink(any(), any(), anyLong(), any());

        HumanVerificationService humanVerificationService = mock(HumanVerificationService.class);

        PasswordResetService service = new PasswordResetService(
            redisTemplate,
            properties,
            mailtrapEmailSender,
            authUserRepository,
            new RateLimitService(redisTemplate),
            new EmailLinkSecretService(redisTemplate, properties),
            humanVerificationService
        );

        assertTimeoutPreemptively(Duration.ofMillis(300), () ->
            service.requestPasswordReset(" Writer@Example.com ", "captcha-token-abc")
        );

        verify(humanVerificationService).consumeVerificationToken("captcha-token-abc", "writer@example.com");
        verify(valueOperations).set(
            startsWith(SecurityRedisKeys.PASSWORD_RESET_LINK_PREFIX),
            eq("42"),
            eq(Duration.ofSeconds(3600))
        );
        assertTrue(mailStarted.await(1, TimeUnit.SECONDS));
        verify(mailtrapEmailSender).sendPasswordResetLink(
            eq("writer@example.com"),
            startsWith("https://www.novel-agent.cn/reset-password?token="),
            eq(3600L),
            eq("https://www.novel-agent.cn")
        );
    }
}
