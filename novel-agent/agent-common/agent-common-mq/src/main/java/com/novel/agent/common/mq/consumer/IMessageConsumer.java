package com.novel.agent.common.mq.consumer;

import com.novel.agent.common.mq.constant.MqTopic;

/**
 * 消息消费者接口
 */
public interface IMessageConsumer {
    <T> T receive(MqTopic topic, Class<T> clazz);
}