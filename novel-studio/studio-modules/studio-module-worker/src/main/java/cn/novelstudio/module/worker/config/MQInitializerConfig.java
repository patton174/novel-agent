package cn.novelstudio.module.worker.config;

import cn.novelstudio.platform.messaging.constant.MqTopic;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.context.annotation.Configuration;

/**
 * MQ 队列初始化配置
 */
@Configuration
public class MQInitializerConfig {

    private static final Logger log = LoggerFactory.getLogger(MQInitializerConfig.class);

    private final RabbitAdmin rabbitAdmin;

    public MQInitializerConfig(RabbitAdmin rabbitAdmin) {
        this.rabbitAdmin = rabbitAdmin;
    }

    @PostConstruct
    public void init() {
        for (MqTopic topic : MqTopic.values()) {
            try {
                Queue queue = new Queue(topic.getQueue(), true);
                TopicExchange exchange = new TopicExchange(topic.getExchange());
                Binding binding = BindingBuilder.bind(queue).to(exchange).with(topic.getRoutingKey());

                rabbitAdmin.declareQueue(queue);
                rabbitAdmin.declareExchange(exchange);
                rabbitAdmin.declareBinding(binding);

                log.info("MQ队列初始化成功: queue={}", topic.getQueue());
            } catch (Exception e) {
                log.error("MQ队列初始化失败: topic={}", topic, e);
            }
        }
    }
}