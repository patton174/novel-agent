package cn.novelstudio.platform.messaging.constant;

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

    AGENT_RUN_EVENTS("agent.run.exchange", "run.events", "agent.run.events.queue"),

    // 书库章节向量索引
    CATALOG_INDEX("agent.catalog-index.exchange", "agent.catalog-index.persist", "agent.catalog-index.queue"),

    USAGE_EVENT("agent.usage.exchange", "usage.report", "agent.usage.queue"),

    // 知识图谱回填
    KG_BACKFILL("agent.kg.exchange", "kg.backfill", "agent.kg.backfill.queue"),

    // 文件上传异步解析
    FILE_PARSE("agent.file.parse.exchange", "file.parse", "agent.file.parse.queue"),

    // 平台批量任务（定时/异步分片调度）
    BATCH_JOB("studio.batch.exchange", "batch.dispatch", "studio.batch.queue"),

    // 书库书 RAG 索引（私人书）
    LIBRARY_INDEX("agent.library-index.exchange", "library.index", "agent.library-index.queue"),

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