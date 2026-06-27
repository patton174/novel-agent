package cn.novelstudio.module.billing.support;

import cn.novelstudio.kernel.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingRpmCheckerTest {

    @Mock
    StringRedisTemplate redis;
    @InjectMocks
    BillingRpmChecker checker;

    @Test
    void check_underLimit_passes() {
        stubIncrement(1L);
        assertThatCode(() -> checker.check(10L, 60, Duration.ofSeconds(60)))
            .doesNotThrowAnyException();
    }

    @Test
    void check_overLimit_throws() {
        stubIncrement(61L);
        assertThatThrownBy(() -> checker.check(10L, 60, Duration.ofSeconds(60)))
            .isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void check_firstRequest_setsExpiry() {
        stubIncrement(1L);
        Duration window = Duration.ofSeconds(60);
        checker.check(10L, 60, window);
        verify(redis).expire(eq("billing:rpm:10"), eq(window));
    }

    @SuppressWarnings("unchecked")
    private void stubIncrement(long count) {
        ValueOperations<String, String> vops = mock(ValueOperations.class);
        when(vops.increment(anyString())).thenReturn(count);
        when(redis.opsForValue()).thenReturn(vops);
    }
}
