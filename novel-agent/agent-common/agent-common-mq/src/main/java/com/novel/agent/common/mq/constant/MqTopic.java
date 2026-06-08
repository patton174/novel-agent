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

    CRAWL_DISPATCH("agent.crawl.exchange", "crawl.dispatch", "agent.crawl.dispatch.queue"),

    // 爬取书库章节向量索引
    CATALOG_INDEX("agent.catalog-index.exchange", "agent.catalog-index.persist", "agent.catalog-index.queue"),

    USAGE_EVENT("agent.usage.exchange", "usage.report", "agent.usage.queue"),

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