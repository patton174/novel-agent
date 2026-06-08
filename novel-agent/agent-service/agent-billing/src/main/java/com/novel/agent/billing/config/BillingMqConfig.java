package com.novel.agent.billing.config;

import com.novel.agent.common.mq.constant.MqTopic;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BillingMqConfig {

    @Bean
    TopicExchange usageEventExchange() {
        return new TopicExchange(MqTopic.USAGE_EVENT.getExchange(), true, false);
    }

    @Bean
    Queue usageEventQueue() {
        return new Queue(MqTopic.USAGE_EVENT.getQueue(), true);
    }

    @Bean
    Binding usageEventBinding(Queue usageEventQueue, TopicExchange usageEventExchange) {
        return BindingBuilder.bind(usageEventQueue)
            .to(usageEventExchange)
            .with(MqTopic.USAGE_EVENT.getRoutingKey());
    }
}
