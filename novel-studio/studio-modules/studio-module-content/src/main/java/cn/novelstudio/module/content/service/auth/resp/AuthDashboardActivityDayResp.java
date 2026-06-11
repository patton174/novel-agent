package cn.novelstudio.module.content.service.auth.resp;

public record AuthDashboardActivityDayResp(
    String date,
    long writingWords,
    long agentRuns
) {}
