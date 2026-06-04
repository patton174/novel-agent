package com.novel.agent.common.mq.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novel.agent.common.mq.consumer.IMessageConsumer;
import com.novel.agent.common.mq.consumer.RabbitMessageConsumer;
import com.novel.agent.common.mq.producer.IMessageProducer;
import com.novel.agent.common.mq.producer.RabbitMessageProducer;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnClass(RabbitTemplate.class)
public class MqAutoConfiguration {

    @Bean
    public ObjectMapper mqObjectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public IMessageProducer messageProducer(RabbitTemplate rabbitTemplate, ObjectMapper mqObjectMapper) {
        return new RabbitMessageProducer(rabbitTemplate, mqObjectMapper);
    }

    @Bean
    public IMessageConsumer messageConsumer(RabbitTemplate rabbitTemplate, ObjectMapper mqObjectMapper) {
        return new RabbitMessageConsumer(rabbitTemplate, mqObjectMapper);
    }
}
