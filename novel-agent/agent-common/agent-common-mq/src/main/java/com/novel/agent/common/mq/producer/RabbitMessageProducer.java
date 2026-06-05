package com.novel.agent.common.mq.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.constant.MqTopic;
import com.novel.agent.common.mq.support.MqExceptions;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

/**
 * RabbitMQ 消息发送实现
 */
public class RabbitMessageProducer implements IMessageProducer {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    public RabbitMessageProducer(RabbitTemplate rabbitTemplate, ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public <T> void send(MqTopic topic, T message) {
        try {
            String json = objectMapper.writeValueAsString(message);
            rabbitTemplate.convertAndSend(topic.getExchange(), topic.getRoutingKey(), json);
        } catch (Exception e) {
            throw MqExceptions.sendFailed(topic.name());
        }
    }
}