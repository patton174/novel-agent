package cn.novelstudio.platform.messaging.producer;

import cn.novelstudio.platform.messaging.constant.MqTopic;

/**
 * 消息生产者接口
 */
public interface IMessageProducer {
    <T> void send(MqTopic topic, T message);
}