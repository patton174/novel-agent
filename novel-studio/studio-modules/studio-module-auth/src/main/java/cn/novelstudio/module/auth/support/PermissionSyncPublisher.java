package cn.novelstudio.module.auth.support;

import cn.novelstudio.platform.messaging.constant.MqTopic;
import cn.novelstudio.platform.messaging.dto.PermissionSyncMessage;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class PermissionSyncPublisher {

    private final IMessageProducer messageProducer;

    public void publish(Long userId, String role) {
        if (userId == null) {
            return;
        }
        try {
            messageProducer.send(MqTopic.PERMISSION, new PermissionSyncMessage(userId, role));
        } catch (Exception ex) {
            log.warn("permission sync publish failed userId={}: {}", userId, ex.getMessage());
        }
    }
}
