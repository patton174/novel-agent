package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.SecurityRedisKeys;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
public class BootstrapRuntimeSupport {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public BootstrapRuntimeSupport(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<BootstrapRuntime> current() {
        String json = redisTemplate.opsForValue().get(SecurityRedisKeys.CRYPTO_BOOTSTRAP_KEY);
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, BootstrapRuntime.class));
        } catch (Exception ex) {
            log.warn("bootstrap runtime parse failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public record BootstrapRuntime(
        String keyId,
        String aesKeyB64,
        long version,
        long expiresAtEpochMs,
        String apiPathPrefix,
        String registeredBy
    ) {
    }
}
