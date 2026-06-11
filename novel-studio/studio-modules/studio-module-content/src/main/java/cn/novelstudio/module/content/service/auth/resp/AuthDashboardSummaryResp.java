package cn.novelstudio.module.content.service.auth.resp;

public record AuthDashboardSummaryResp(
    long novelCount,
    long chapterCount,
    long weeklyWordCount,
    long agentRunCount
) {}
