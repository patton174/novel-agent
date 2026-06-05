package com.novel.agent.content.service.crm.resp;

public record CrmStatsOverviewResp(
    long totalNovels,
    long totalChapters,
    long totalAgentRuns
) {}
