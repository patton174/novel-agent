package com.novel.agent.content.service.auth.resp;

public record AuthDashboardSummaryResp(
    long novelCount,
    long chapterCount,
    long weeklyWordCount,
    long agentRunCount
) {}
