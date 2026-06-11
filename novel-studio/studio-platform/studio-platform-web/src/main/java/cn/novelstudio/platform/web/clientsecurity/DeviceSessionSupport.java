package cn.novelstudio.platform.web.clientsecurity;

import cn.novelstudio.platform.security.DeviceSessionRecord;
import cn.novelstudio.platform.security.SecurityRedisKeys;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
public class DeviceSessionSupport {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public DeviceSessionSupport(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<DeviceSessionRecord> load(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return Optional.empty();
        }
        String json = redisTemplate.opsForValue().get(SecurityRedisKeys.DEVICE_PREFIX + sessionId);
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readValue(json, DeviceSessionRecord.class));
        } catch (JsonProcessingException ex) {
            log.warn("invalid device session sid={}: {}", sessionId, ex.getMessage());
            return Optional.empty();
        }
    }
}
