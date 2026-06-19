package com.novel.agent.content.service.auth.resp;

public record AuthDashboardActivityDayResp(
    String date,
    long writingWords,
    long agentRuns
) {}
