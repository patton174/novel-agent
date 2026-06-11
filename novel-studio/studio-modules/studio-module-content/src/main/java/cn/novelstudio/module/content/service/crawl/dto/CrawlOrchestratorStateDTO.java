package cn.novelstudio.module.content.service.crawl.dto;

public record CrawlOrchestratorStateDTO(
    String goal,
    String status,
    int runningJobCount,
    int maxConcurrentJobs,
    String lastDecision,
    long updatedAt,
    Boolean agentEnabled,
    Boolean agentLlmConfigured
) {}
