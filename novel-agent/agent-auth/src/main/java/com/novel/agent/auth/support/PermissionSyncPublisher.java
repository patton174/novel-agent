package com.novel.agent.auth.support;

import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.dto.PermissionSyncMessage;
import com.novel.agent.common.mq.producer.IMessageProducer;
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
