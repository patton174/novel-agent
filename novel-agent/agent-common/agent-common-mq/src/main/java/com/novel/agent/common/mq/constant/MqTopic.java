package com.novel.agent.common.mq.constant;

import lombok.Getter;

/**
 * MQ 主题枚举 - 统一管理交换机、路由key、队列名
 */
@Getter
public enum MqTopic {

    // 权限同步
    PERMISSION("permission.exchange", "permission.sync", "permission.queue"),
    // Agent 会话异步持久化
    AGENT_SESSION("agent.session.exchange", "agent.session.persist", "agent.session.queue"),
    // 故事记忆异步落 PostgreSQL
    STORY_MEMORY("agent.story-memory.exchange", "agent.story-memory.persist", "agent.story-memory.queue"),

    ;

    private final String exchange;
    private final String routingKey;
    private final String queue;

    MqTopic(String exchange, String routingKey, String queue) {
        this.exchange = exchange;
        this.routingKey = routingKey;
        this.queue = queue;
    }
}