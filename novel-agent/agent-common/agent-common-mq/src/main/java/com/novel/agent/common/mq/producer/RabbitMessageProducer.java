package com.novel.agent.common.mq.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.constant.MqTopic;
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
            throw new IllegalStateException("发送 MQ 消息失败: " + topic.name(), e);
        }
    }
}