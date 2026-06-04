package com.novel.agent.common.mq.producer;

import com.novel.agent.common.mq.constant.MqTopic;

/**
 * 消息生产者接口
 */
public interface IMessageProducer {
    <T> void send(MqTopic topic, T message);
}