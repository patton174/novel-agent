package cn.novelstudio.platform.messaging.consumer;

import cn.novelstudio.platform.messaging.constant.MqTopic;

/**
 * 消息消费者接口
 */
public interface IMessageConsumer {
    <T> T receive(MqTopic topic, Class<T> clazz);
}