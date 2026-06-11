package cn.novelstudio.platform.messaging.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.constant.MqTopic;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

/**
 * RabbitMQ 消息接收实现
 */
public class RabbitMessageConsumer implements IMessageConsumer {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public RabbitMessageConsumer(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public <T> T receive(MqTopic topic, Class<T> clazz) {
        Object message = rabbitTemplate.receiveAndConvert(topic.getRoutingKey());
        if (message == null) {
            return null;
        }
        return objectMapper.convertValue(message, clazz);
    }
}