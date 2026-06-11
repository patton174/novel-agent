package cn.novelstudio.module.content.service.crm.resp;

public record CrmStatsOverviewResp(
    long totalNovels,
    long totalChapters,
    long totalAgentRuns
) {}
