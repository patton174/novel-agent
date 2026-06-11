package cn.novelstudio.platform.messaging.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import cn.novelstudio.platform.messaging.consumer.IMessageConsumer;
import cn.novelstudio.platform.messaging.consumer.RabbitMessageConsumer;
import cn.novelstudio.platform.messaging.producer.IMessageProducer;
import cn.novelstudio.platform.messaging.producer.RabbitMessageProducer;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@ConditionalOnClass(RabbitTemplate.class)
public class MqAutoConfiguration {

    /** 勿注册为 {@code @Bean ObjectMapper}，否则会顶替 Boot 自带 JSR310 配置并导致 HTTP 序列化 Instant 失败。 */
    private static ObjectMapper mqObjectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public IMessageProducer messageProducer(RabbitTemplate rabbitTemplate) {
        return new RabbitMessageProducer(rabbitTemplate, mqObjectMapper());
    }

    @Bean
    public IMessageConsumer messageConsumer(RabbitTemplate rabbitTemplate) {
        return new RabbitMessageConsumer(rabbitTemplate, mqObjectMapper());
    }
}
