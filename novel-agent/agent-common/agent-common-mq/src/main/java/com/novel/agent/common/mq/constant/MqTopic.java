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

    AGENT_RUN_DISPATCH("agent.run.exchange", "run.dispatch", "agent.run.dispatch.queue"),
    AGENT_RUN_EVENTS("agent.run.exchange", "run.events", "agent.run.events.queue"),
    AGENT_RUN_COMMAND("agent.run.exchange", "run.command", "agent.run.command.queue"),

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